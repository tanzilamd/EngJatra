import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import { initialProgress } from "../../packages/contracts/api";
let db: PGlite;
const a = "11111111-1111-1111-1111-111111111111",
  b = "22222222-2222-2222-2222-222222222222";
const reply = {
  assistant_reply_en: "Use go with I.",
  short_explanation_bn: "এই বাক্যে I-এর সঙ্গে go বসে।",
  feedback_type: "clear_error",
  suggested_revision_en: "I go to the market.",
  next_question_en: "What do you buy?",
  learning_tags: ["grammar"],
  source_unit_id: "P0-01",
};
async function asUser<T>(id: string, fn: () => Promise<T>) {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`,
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
async function save(id: string | null, key = crypto.randomUUID()) {
  const r = await db.query<{ id: string | null }>(
    "select tutor_save_turn($1,$2,'P0-01','3.0.13','conversation','I goes to the market.',$3) as id",
    [id, key, reply],
  );
  return r.rows[0].id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;insert into auth.users values('${a}'),('${b}');`,
  );
  await db.exec(
    readFileSync("supabase/migrations/202610090001_initial.sql", "utf8"),
  );
  await asUser(a, async () => {
    await db.query("select save_checkpoint(0,$1,$2)", [
      crypto.randomUUID(),
      { ...initialProgress, keep_history: true },
    ]);
    await db.query("select save_chat('P0-01','Hello','Hello!')");
  });
  await db.exec(
    readFileSync("supabase/migrations/202610100001_tutor_threads.sql", "utf8"),
  );
});
afterAll(async () => {
  await db.close();
});
it("legacy upgrade retains earlier messages, paths and own-read RLS", async () => {
  const rows = await db.query<{ content: string }>(
    "select content from messages order by created_at,id",
  );
  expect(rows.rows.map((r) => r.content).sort()).toEqual(["Hello", "Hello!"]);
  expect((await db.query("select * from learner_paths")).rows).toHaveLength(1);
  const policies = await db.query(
    "select * from pg_policies where tablename in ('messages','conversations') and policyname='own_read'",
  );
  expect(policies.rows).toHaveLength(2);
});
it("opt-out, anonymous and cross-user continuation/deletion fail without touching another user's messages", async () => {
  await asUser(b, async () => expect(await save(null)).toBeNull());
  const id = await asUser(a, () => save(null));
  expect(id).toBeTruthy();
  await asUser(b, async () => {
    await db.query("select save_checkpoint(0,$1,$2)", [
      crypto.randomUUID(),
      { ...initialProgress, keep_history: true },
    ]);
    for (const sql of ["select tutor_thread($1)", "select tutor_delete($1)"])
      await expect(db.query(sql, [id])).rejects.toThrow("FORBIDDEN");
    await expect(save(id)).rejects.toThrow("FORBIDDEN");
    expect((await db.query("select * from conversations")).rows).toHaveLength(
      0,
    );
    await expect(
      db.exec("update messages set content='forged'"),
    ).rejects.toThrow();
  });
  await db.exec("set role anon");
  try {
    await expect(db.query("select tutor_threads(0)")).rejects.toThrow();
  } finally {
    await db.exec("reset role");
  }
});
it("continued threads preserve structured bilingual feedback and deduplicate saved request IDs", async () => {
  await asUser(a, async () => {
    const key = crypto.randomUUID(),
      id = await save(null, key);
    expect(await save(null, key)).toBe(id);
    await save(id);
    const r = await db.query<{ thread: { messages: { reply: unknown }[] } }>(
      "select tutor_thread($1) as thread",
      [id],
    );
    expect(r.rows[0].thread.messages).toHaveLength(4);
    expect(r.rows[0].thread.messages[1].reply).toEqual(reply);
    await expect(db.query("select tutor_threads(10)")).rejects.toThrow(
      "INVALID_STATE",
    );
    await db.query("select tutor_delete($1)", [id]);
    expect(
      (await db.query("select * from messages where conversation_id=$1", [id]))
        .rows,
    ).toHaveLength(0);
  });
});
it("history limits stop growth and clear keeps learning progress", async () => {
  await asUser(a, async () => {
    const id = await save(null);
    for (let i = 1; i < 25; i++) await save(id);
    expect(await save(id)).toBeNull();
    const before = (await db.query("select state,revision from learner_paths"))
      .rows;
    await db.query("select clear_history()");
    expect((await db.query("select tutor_threads(0) as rows")).rows).toEqual([
      { rows: [] },
    ]);
    expect(
      (await db.query("select state,revision from learner_paths")).rows,
    ).toEqual(before);
  });
});
