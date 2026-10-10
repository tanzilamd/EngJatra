-- Additive optional-chat upgrade. Apply only after historical provenance/backup
-- reconciliation and reviewed approval. No table recreation or initial replay.
alter table public.conversations
 add column mode text not null default 'lesson' check(mode in ('lesson','conversation')),
 add column release text not null default '3.0.0' check(release ~ '^\d+\.\d+\.\d+$'),
 add column title text not null default 'আগের অনুশীলন' check(length(title) between 1 and 80);
alter table public.messages
 add column ordinal bigint generated always as identity,
 add column reply jsonb,
 add column request_id uuid;
create unique index tutor_saved_request on public.messages(user_id,request_id) where request_id is not null;

create function public.tutor_threads(p_page integer default 0) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 if p_page<0 or p_page>9 then raise exception 'INVALID_STATE';end if;
 return coalesce((select jsonb_agg(to_jsonb(t)) from
 (select id,unit_id,release,mode,title,created_at from conversations
 where user_id=auth.uid() order by created_at desc,id offset p_page*10 limit 10) t),'[]');
end $$;
create function public.tutor_thread(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare h jsonb;begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 select jsonb_build_object('id',id,'unit_id',unit_id,'release',release,'mode',mode,'title',title,'created_at',created_at)
 into h from conversations where id=p_id and user_id=auth.uid();
 if h is null then raise exception 'FORBIDDEN';end if;
 return h||jsonb_build_object('messages',coalesce((select jsonb_agg(to_jsonb(t)) from
 (select id,role,content,reply from messages where conversation_id=p_id and user_id=auth.uid()
 order by ordinal limit 50) t),'[]'));
end $$;
create function public.tutor_delete(p_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 if not exists(select 1 from conversations where id=p_id and user_id=auth.uid()) then raise exception 'FORBIDDEN';end if;
 delete from conversations where id=p_id and user_id=auth.uid();
end $$;
create function public.tutor_save_turn(p_id uuid,p_key uuid,p_unit text,p_release text,p_mode text,p_user text,p_reply jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare cid uuid; uid uuid:=auth.uid();begin
 if uid is null then raise exception 'UNAUTHENTICATED';end if;
 -- Same-user lock caps aggregate history and deduplicates concurrent saves.
 perform pg_advisory_xact_lock(hashtext('tutor:'||uid::text));
 if not coalesce((select (state->>'keep_history')::boolean from learner_paths where user_id=uid),false) then return null;end if;
 if p_key is null or p_unit !~ '^(P0|A1|A2|B1|B2|C1)-(0[1-9]|1[0-6])$' or p_release !~ '^\d+\.\d+\.\d+$'
 or p_mode not in ('lesson','conversation') or length(p_user) not between 1 and 1500
 or jsonb_typeof(p_reply) is distinct from 'object' or length(p_reply::text)>8000
 or (p_reply->>'source_unit_id') is distinct from p_unit
 or length(coalesce(p_reply->>'assistant_reply_en','')) not between 1 and 1200
 then raise exception 'INVALID_STATE';end if;
 select conversation_id into cid from messages where user_id=uid and request_id=p_key;
 if cid is not null then return cid;end if;
 if p_id is null then
  if (select count(*) from conversations where user_id=uid)>=100 then return null;end if;
  insert into conversations(user_id,unit_id,release,mode,title)
  values(uid,p_unit,p_release,p_mode,left(p_user,80)) returning id into cid;
 else
  select id into cid from conversations where id=p_id and user_id=uid and unit_id=p_unit and release=p_release and mode=p_mode for update;
  if cid is null then raise exception 'FORBIDDEN';end if;
  if (select count(*) from messages where user_id=uid and conversation_id=cid)>=50 then return null;end if;
 end if;
 -- Stable ordering: assistant follows user even within one transaction.
 insert into messages(conversation_id,user_id,role,content,created_at)
 values(cid,uid,'user',p_user,clock_timestamp());
 insert into messages(conversation_id,user_id,role,content,reply,request_id,created_at)
 values(cid,uid,'assistant',p_reply->>'assistant_reply_en',p_reply,p_key,clock_timestamp());
 return cid;
end $$;
revoke all on function public.tutor_threads(integer),public.tutor_thread(uuid),public.tutor_delete(uuid),public.tutor_save_turn(uuid,uuid,text,text,text,text,jsonb) from public,anon;
grant execute on function public.tutor_threads(integer),public.tutor_thread(uuid),public.tutor_delete(uuid),public.tutor_save_turn(uuid,uuid,text,text,text,text,jsonb) to authenticated;
-- No new table grants/policies: original own_read RLS stays intact and ordinary
-- learners still cannot directly insert/update messages or conversations.
