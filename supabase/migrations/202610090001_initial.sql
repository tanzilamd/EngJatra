-- EngJatra initial schema. Apply only to an owner-approved project.
create table public.admin_memberships(user_id uuid primary key references auth.users(id) on delete cascade, role text not null check(role in ('content_reviewer','content_editor','admin','owner')), granted_by uuid, created_at timestamptz not null default now());
create function public.staff_role() returns text language sql stable security definer set search_path=public,pg_temp as $$ select role from admin_memberships where user_id=auth.uid() $$;
create table public.profiles(user_id uuid primary key references auth.users(id) on delete cascade, alias text check(length(alias)<=80), created_at timestamptz not null default now());
create table public.learner_paths(user_id uuid primary key references auth.users(id) on delete cascade, revision integer not null default 0 check(revision>=0), state jsonb not null default '{"unit_id":"P0-01","step":0,"release":"3.0.0","completed":[],"words":[],"mistakes":[],"attempts":[],"onboarded":false,"tour":false,"hints":true,"large_text":false,"keep_history":false}', updated_at timestamptz not null default now());
create table public.learner_settings(user_id uuid primary key references auth.users(id) on delete cascade, preferences jsonb not null default '{}');
create table public.unit_progress(user_id uuid references auth.users(id) on delete cascade,unit_id text check(unit_id ~ '^(P0|A1|A2|B1|B2|C1)-(0[1-9]|1[0-6])$'),release text not null,completed_at timestamptz not null default now(),primary key(user_id,unit_id));
create table public.vocabulary_mastery(user_id uuid references auth.users(id) on delete cascade,sense_id text,unit_id text not null,stage integer not null check(stage between 0 and 4),due_at timestamptz not null, primary key(user_id,sense_id));
create table public.mistake_events(user_id uuid references auth.users(id) on delete cascade,activity_id text,unit_id text not null,skill text not null,created_at timestamptz not null default now(),primary key(user_id,activity_id));
create table public.activity_attempts(id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,unit_id text not null,activity_id text not null,release text not null,outcome boolean,created_at timestamptz not null default now());
create table public.checkpoint_receipts(user_id uuid references auth.users(id) on delete cascade,idempotency_key uuid,response jsonb not null,created_at timestamptz default now(),primary key(user_id,idempotency_key));
create table public.conversations(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,unit_id text not null,created_at timestamptz not null default now(),unique(id,user_id));
create table public.messages(id uuid primary key default gen_random_uuid(),conversation_id uuid not null,user_id uuid not null references auth.users(id) on delete cascade,role text not null check(role in ('user','assistant')),content text not null check(length(content)<=1500),created_at timestamptz not null default now(), foreign key(conversation_id,user_id) references public.conversations(id,user_id) on delete cascade);
create table public.user_reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references auth.users(id) on delete cascade,unit_id text not null, item_id text not null check(length(item_id)<=100),release text not null,category text not null check(category in ('translation','grammar','answer','ai','support','deletion')),text text not null check(length(text) between 5 and 1500),state text not null default 'open' check(state in ('open','investigating','resolved')),created_at timestamptz not null default now());
create table public.content_overrides(unit_id text primary key,release text not null,patch jsonb not null,revision integer not null default 1,review_status text not null default 'draft',admin_notes text not null default '',edited_by uuid not null references auth.users(id),updated_at timestamptz not null default now());
create table public.content_blocks(item_id text primary key,created_by uuid not null references auth.users(id),created_at timestamptz not null default now());
create table public.content_releases(id text primary key,manifest_sha256 text not null check(length(manifest_sha256)=64),state text not null check(state in ('awaiting_deploy','deployed','rollback_requested')),created_by uuid not null references auth.users(id),created_at timestamptz not null default now());
create table public.admin_audit(id bigint generated always as identity primary key,actor uuid not null references auth.users(id),action text not null,object_id text not null,created_at timestamptz not null default now());
create table public.usage_counters(scope text not null,window_start date not null,minute_start timestamptz not null,minute_count integer not null default 0,count integer not null default 0,primary key(scope,window_start));
create table public.provider_health(provider text primary key,category text not null,observed_at timestamptz not null default now());
create index on public.vocabulary_mastery(user_id,due_at);
create index on public.conversations(user_id,created_at desc);
create index on public.messages(user_id,conversation_id,created_at);
create index on public.user_reports(state,created_at);
create index on public.learner_paths(user_id,updated_at);
alter table public.profiles enable row level security;
create policy own_read on public.profiles for select to authenticated using (auth.uid() is not null and user_id=auth.uid());
alter table public.learner_paths enable row level security;
create policy own_read on public.learner_paths for select to authenticated using (auth.uid() is not null and user_id=auth.uid());
alter table public.learner_settings enable row level security;
create policy own_read on public.learner_settings for select to authenticated using (auth.uid() is not null and user_id=auth.uid());
alter table public.unit_progress enable row level security;
create policy own_read on public.unit_progress for select to authenticated using (auth.uid() is not null and user_id=auth.uid());
alter table public.vocabulary_mastery enable row level security;
create policy own_read on public.vocabulary_mastery for select to authenticated using (auth.uid() is not null and user_id=auth.uid());
alter table public.mistake_events enable row level security;
create policy own_read on public.mistake_events for select to authenticated using (auth.uid() is not null and user_id=auth.uid());
alter table public.activity_attempts enable row level security;
create policy own_read on public.activity_attempts for select to authenticated using (auth.uid() is not null and user_id=auth.uid());
alter table public.checkpoint_receipts enable row level security;
create policy own_read on public.checkpoint_receipts for select to authenticated using (auth.uid() is not null and user_id=auth.uid());
alter table public.conversations enable row level security;
create policy own_read on public.conversations for select to authenticated using (auth.uid() is not null and user_id=auth.uid());
alter table public.messages enable row level security;
create policy own_read on public.messages for select to authenticated using (auth.uid() is not null and user_id=auth.uid());
create policy own_profile_insert on public.profiles for insert to authenticated with check(user_id=auth.uid());
create policy own_profile_update on public.profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
alter table public.user_reports enable row level security;
create policy reports_read on public.user_reports for select to authenticated using(reporter_id=auth.uid() or public.staff_role() is not null);
alter table public.admin_memberships enable row level security;
create policy membership_self on public.admin_memberships for select to authenticated using(user_id=auth.uid());
alter table public.content_overrides enable row level security;
create policy staff_read on public.content_overrides for select to authenticated using(public.staff_role() is not null);
alter table public.content_releases enable row level security;
create policy staff_read on public.content_releases for select to authenticated using(public.staff_role() is not null);
alter table public.admin_audit enable row level security;
create policy staff_read on public.admin_audit for select to authenticated using(public.staff_role() is not null);
alter table public.usage_counters enable row level security;
create policy staff_read on public.usage_counters for select to authenticated using(public.staff_role() is not null);
alter table public.provider_health enable row level security;
create policy staff_read on public.provider_health for select to authenticated using(public.staff_role() is not null);
alter table public.content_blocks enable row level security;
create policy blocks_public on public.content_blocks for select to anon,authenticated using(true);
grant usage on schema public to anon,authenticated;
grant select on all tables in schema public to authenticated;
grant select(item_id) on public.content_blocks to anon;
grant insert,update on public.profiles to authenticated;

create function public.read_snapshot() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p learner_paths;begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 insert into profiles(user_id) values(auth.uid()) on conflict do nothing;
 insert into learner_paths(user_id) values(auth.uid()) on conflict do nothing;
 select * into p from learner_paths where user_id=auth.uid();return jsonb_build_object('revision',p.revision,'state',p.state);end $$;

create function public.save_checkpoint(p_expected integer,p_key uuid,p_state jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p learner_paths;receipt jsonb;result jsonb;v jsonb;uid uuid:=auth.uid();begin
 if uid is null then raise exception 'UNAUTHENTICATED';end if;
 if p_state is null or jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>300000 then raise exception 'INVALID_STATE';end if;
 if p_state->>'unit_id' !~ '^(P0|A1|A2|B1|B2|C1)-(0[1-9]|1[0-6])$' or p_state->>'release' !~ '^\d+\.\d+\.\d+$' or (p_state->>'step')::integer not between 0 and 30 then raise exception 'INVALID_STATE';end if;
 if jsonb_typeof(p_state->'completed')<>'array' or jsonb_array_length(p_state->'completed')>96 or jsonb_typeof(p_state->'words')<>'array' or jsonb_array_length(p_state->'words')>1500 or jsonb_typeof(p_state->'mistakes')<>'array' or jsonb_array_length(p_state->'mistakes')>300 then raise exception 'INVALID_STATE';end if;
 if not (p_state ?& array['unit_id','step','release','completed','words','mistakes','attempts','onboarded','tour','hints','large_text','keep_history']) then raise exception 'INVALID_STATE';end if;
 if jsonb_typeof(p_state->'attempts') is distinct from 'array' or jsonb_array_length(p_state->'attempts')>300 then raise exception 'INVALID_STATE';end if;
 if exists(select 1 from jsonb_object_keys(p_state) key where key not in ('unit_id','step','release','completed','words','mistakes','attempts','onboarded','tour','hints','large_text','keep_history')) then raise exception 'INVALID_STATE';end if;
 if jsonb_typeof(p_state->'unit_id') is distinct from 'string' or jsonb_typeof(p_state->'release') is distinct from 'string' or jsonb_typeof(p_state->'step') is distinct from 'number' then raise exception 'INVALID_STATE';end if;
 if exists(select 1 from unnest(array['onboarded','tour','hints','large_text','keep_history']) k where jsonb_typeof(p_state->k) is distinct from 'boolean') then raise exception 'INVALID_STATE';end if;

 insert into learner_paths(user_id) values(uid) on conflict do nothing;
 select * into p from learner_paths where user_id=uid for update;
 select response into receipt from checkpoint_receipts where user_id=uid and idempotency_key=p_key;
 if receipt is not null then return receipt;end if;
 if p.revision<>p_expected then return jsonb_build_object('conflict',true,'snapshot',jsonb_build_object('revision',p.revision,'state',p.state));end if;
 -- Completed lessons are monotonic across devices. Keep prior completions on retries/refresh.
 select jsonb_set(p_state,'{completed}',coalesce(jsonb_agg(distinct val),'[]')) into p_state from (select value as val from jsonb_array_elements(p_state->'completed') union select value from jsonb_array_elements(p.state->'completed')) merged;
 update learner_paths set state=p_state,revision=revision+1,updated_at=now() where user_id=uid returning * into p;
 insert into learner_settings(user_id,preferences) values(uid,jsonb_build_object('hints',p_state->'hints','tour',p_state->'tour','large_text',p_state->'large_text','keep_history',p_state->'keep_history')) on conflict(user_id) do update set preferences=excluded.preferences;
 for v in select * from jsonb_array_elements(p_state->'completed') loop insert into unit_progress(user_id,unit_id,release) values(uid,v#>>'{}',p_state->>'release') on conflict do nothing;end loop;
 for v in select * from jsonb_array_elements(p_state->'words') loop
 insert into vocabulary_mastery(user_id,sense_id,unit_id,stage,due_at) values(uid,v->>'sense_id',v->>'unit_id',(v->>'stage')::integer,(v->>'due_at')::timestamptz) on conflict(user_id,sense_id) do update set stage=excluded.stage,due_at=excluded.due_at where vocabulary_mastery.stage is distinct from excluded.stage or vocabulary_mastery.due_at is distinct from excluded.due_at;end loop;
 delete from mistake_events where user_id=uid and activity_id not in (select value->>'activity_id' from jsonb_array_elements(p_state->'mistakes'));
 for v in select * from jsonb_array_elements(p_state->'mistakes') loop insert into mistake_events(user_id,activity_id,unit_id,skill) values(uid,v->>'activity_id',v->>'unit_id',v->>'skill') on conflict do nothing;end loop;
 for v in select * from jsonb_array_elements(p_state->'attempts') loop insert into activity_attempts(id,user_id,unit_id,activity_id,release,outcome) values((v->>'id')::uuid,uid,v->>'unit_id',v->>'activity_id',v->>'release',(v->>'outcome')::boolean) on conflict do nothing;end loop;
 -- Only answer outcome is stored. Detailed attempts expire after 60 days; progress is retained.
 delete from activity_attempts where user_id=uid and (created_at<now()-interval '60 days' or id in (select id from activity_attempts where user_id=uid order by created_at desc,id offset 1000));
 result=jsonb_build_object('revision',p.revision,'state',p.state);
 insert into checkpoint_receipts values(uid,p_key,result,now());
 delete from checkpoint_receipts where user_id=uid and created_at<now()-interval '30 days';
 return result;end $$;

create function public.submit_report(p_report jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare rid uuid;begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from user_reports where reporter_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'REPORT_LIMIT';end if;
 insert into user_reports(reporter_id,unit_id,item_id,release,category,text) values(auth.uid(),p_report->>'unit_id',p_report->>'item_id',p_report->>'release',p_report->>'category',p_report->>'text') returning id into rid;return rid;end $$;

create function public.consume_ai() returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();g usage_counters;u usage_counters;begin
 if uid is null then raise exception 'UNAUTHENTICATED';end if;
 insert into usage_counters(scope,window_start,minute_start) values('global',current_date,date_trunc('minute',now())) on conflict do nothing;
 select * into g from usage_counters where scope='global' and window_start=current_date for update;
 insert into usage_counters(scope,window_start,minute_start) values(uid::text,current_date,date_trunc('minute',now())) on conflict do nothing;
 select * into u from usage_counters where scope=uid::text and window_start=current_date for update;
 if g.count>=200 or u.count>=20 or (u.minute_start=date_trunc('minute',now()) and u.minute_count>=4) then return false;end if;
 update usage_counters set count=count+1,minute_count=case when minute_start=date_trunc('minute',now()) then minute_count+1 else 1 end,minute_start=date_trunc('minute',now()) where scope in ('global',uid::text) and window_start=current_date;
 delete from usage_counters where window_start<current_date-30;
 return true;end $$;

create function public.save_chat(p_unit text,p_user text,p_reply text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare cid uuid;begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 if not coalesce((select (state->>'keep_history')::boolean from learner_paths where user_id=auth.uid()),false) then return null;end if;
 if (select count(*) from conversations where user_id=auth.uid())>=100 then return null;end if;
 insert into conversations(user_id,unit_id) values(auth.uid(),p_unit) returning id into cid;
 insert into messages(conversation_id,user_id,role,content) values(cid,auth.uid(),'user',p_user),(cid,auth.uid(),'assistant',p_reply);return cid;end $$;
create function public.clear_history() returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if; delete from conversations where user_id=auth.uid();end $$;

create function public.admin_mutate(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r text:=public.staff_role();id text;v integer;result jsonb:='{"ok":true}';begin
 if r is null then raise exception 'FORBIDDEN';end if;
 if p_action='report' then
 if r not in ('content_reviewer','content_editor','admin','owner') then raise exception 'FORBIDDEN';end if;
 update user_reports set state=p_data->>'state' where user_reports.id=(p_data->>'id')::uuid;id=p_data->>'id';
 elsif p_action='review' then
 id=p_data->>'unit_id';perform pg_advisory_xact_lock(hashtext(id));select revision into v from content_overrides where unit_id=id for update;
 if v is null or v<>(p_data->>'expected_revision')::integer then raise exception 'CONFLICT';end if;
 if p_data->>'review_status' not in ('draft','under_review','ready') then raise exception 'INVALID_STATE';end if;
 update content_overrides set review_status=p_data->>'review_status',admin_notes=left(coalesce(p_data->>'admin_notes',''),2000),revision=revision+1,edited_by=auth.uid(),updated_at=now() where unit_id=id;
 elsif p_action='draft' then
 if r not in ('content_editor','admin','owner') then raise exception 'FORBIDDEN';end if;
 id=p_data->>'unit_id';perform pg_advisory_xact_lock(hashtext(id));select revision into v from content_overrides where unit_id=id for update;
 if coalesce(v,0)<>(p_data->>'expected_revision')::integer then raise exception 'CONFLICT';end if;
 insert into content_overrides(unit_id,release,patch,admin_notes,edited_by) values(id,p_data->>'release',p_data->'patch',left(coalesce(p_data->>'admin_notes',''),2000),auth.uid()) on conflict(unit_id) do update set patch=excluded.patch,release=excluded.release,admin_notes=excluded.admin_notes,revision=content_overrides.revision+1,edited_by=auth.uid(),updated_at=now();
 elsif p_action='block' then
 if r not in ('admin','owner') then raise exception 'FORBIDDEN';end if;
 id=p_data->>'item_id';if (p_data->>'blocked')::boolean then insert into content_blocks(item_id,created_by) values(id,auth.uid()) on conflict do nothing;else delete from content_blocks where item_id=id;end if;
 elsif p_action='release' then
 if r not in ('admin','owner') then raise exception 'FORBIDDEN';end if;
 id=p_data->>'id';insert into content_releases(id,manifest_sha256,state,created_by) values(id,p_data->>'manifest_sha256','awaiting_deploy',auth.uid()) on conflict on constraint content_releases_pkey do nothing;
 elsif p_action='rollback' then
 if r not in ('admin','owner') then raise exception 'FORBIDDEN';end if;
 id=p_data->>'id';update content_releases set state='rollback_requested' where content_releases.id=p_data->>'id';
 else raise exception 'UNKNOWN_ACTION';end if;
 insert into admin_audit(actor,action,object_id) values(auth.uid(),p_action,coalesce(id,''));return result;end $$;
-- RPCs are authenticated-only; no service-role secret is needed in the Worker.
revoke all on all functions in schema public from public,anon;
grant execute on function public.staff_role(),public.read_snapshot(),public.save_checkpoint(integer,uuid,jsonb),public.submit_report(jsonb),public.consume_ai(),public.save_chat(text,text,text),public.clear_history() to authenticated;
-- Publication recording is an owner SQL operation after Worker hash verification;
-- authenticated clients cannot mark a release as deployed.
grant execute on function public.admin_mutate(text,jsonb) to authenticated;

revoke select on public.content_blocks from authenticated;
grant select(item_id) on public.content_blocks to authenticated;
create policy support_read on public.profiles for select to authenticated using(public.staff_role() in ('admin','owner'));
