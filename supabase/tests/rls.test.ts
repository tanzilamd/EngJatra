import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import { initialProgress } from "../../packages/contracts/api";
let db: PGlite;
const a = "11111111-1111-1111-1111-111111111111",
  b = "22222222-2222-2222-2222-222222222222",
  staff = "33333333-3333-3333-3333-333333333333";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${a}'),('${b}'),('${staff}');`,
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.exec(
    `insert into public.admin_memberships(user_id,role) values('${staff}','content_reviewer');`,
  );
});
afterAll(async () => {
  await db.close();
});
async function asUser<T>(id: string, fn: () => Promise<T>) {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}
it("fresh migration creates all tables with RLS enabled", async () => {
  const result = await db.query<{ count: number }>(
    "select count(*)::int as count from pg_tables t join pg_class c on c.relname=t.tablename where schemaname='public' and not c.relrowsecurity",
  );
  expect(result.rows[0].count).toBe(0);
});
it("anonymous RPC cannot obtain a snapshot", async () => {
  await db.exec("set role anon");
  try {
    await expect(db.query("select public.read_snapshot()")).rejects.toThrow();
  } finally {
    await db.exec("reset role");
  }
});
it("cross-user select/write denied; own checkpoint preserved", async () => {
  await asUser(a, async () => {
    await db.query("select public.save_checkpoint($1,$2,$3)", [
      0,
      crypto.randomUUID(),
      JSON.stringify({ ...initialProgress, onboarded: true }),
    ]);
  });
  await asUser(b, async () => {
    expect(
      (await db.query("select * from public.learner_paths")).rows,
    ).toHaveLength(0);
    await expect(
      db.query("update public.learner_paths set revision=99 where user_id=$1", [
        a,
      ]),
    ).rejects.toThrow();
  });
  await asUser(a, async () => {
    expect(
      (await db.query("select * from public.learner_paths")).rows,
    ).toHaveLength(1);
  });
});
it("duplicate checkpoint returns original revision; stale write conflicts", async () => {
  await asUser(a, async () => {
    const key = crypto.randomUUID();
    const state = JSON.stringify(initialProgress);
    const one = await db.query<{ save_checkpoint: { revision: number } }>(
      "select public.save_checkpoint($1,$2,$3)",
      [1, key, state],
    );
    const two = await db.query<{ save_checkpoint: { revision: number } }>(
      "select public.save_checkpoint($1,$2,$3)",
      [1, key, state],
    );
    expect(one.rows[0].save_checkpoint.revision).toBe(2);
    expect(two.rows[0].save_checkpoint.revision).toBe(2);
    const stale = await db.query<{ save_checkpoint: { conflict: boolean } }>(
      "select public.save_checkpoint($1,$2,$3)",
      [0, crypto.randomUUID(), state],
    );
    expect(stale.rows[0].save_checkpoint.conflict).toBe(true);
  });
});
it("cannot forge memberships through direct SQL", async () => {
  await asUser(a, async () => {
    await expect(
      db.query(
        "insert into public.admin_memberships(user_id,role) values($1,'owner')",
        [a],
      ),
    ).rejects.toThrow();
    expect(
      (await db.query("select * from public.admin_memberships")).rows,
    ).toHaveLength(0);
  });
});
it("non-staff cannot read private content or invoke admin RPC", async () => {
  await asUser(a, async () => {
    expect(
      (await db.query("select * from public.content_overrides")).rows,
    ).toHaveLength(0);
    await expect(
      db.query("select public.admin_mutate('block',$1)", [
        JSON.stringify({ item_id: "P0-01", blocked: true }),
      ]),
    ).rejects.toThrow("FORBIDDEN");
  });
});
it("reviewer cannot publish, suspend, edit drafts, or promote role", async () => {
  await asUser(staff, async () => {
    for (const action of ["draft", "block", "release"])
      await expect(
        db.query("select public.admin_mutate($1,$2)", [action, "{}"]),
      ).rejects.toThrow("FORBIDDEN");
    await expect(
      db.query(
        "update public.admin_memberships set role='owner' where user_id=$1",
        [staff],
      ),
    ).rejects.toThrow();
  });
});
it("authenticated staff cannot falsely record deployed state", async () => {
  await db.query(
    "update public.admin_memberships set role='admin' where user_id=$1",
    [staff],
  );
  await asUser(staff, async () => {
    await expect(
      db.query("select public.admin_mutate('confirm',$1)", [
        JSON.stringify({ id: "3.0.1", manifest_sha256: "a".repeat(64) }),
      ]),
    ).rejects.toThrow("UNKNOWN_ACTION");
  });
});
it("suspension exposes IDs but hides actor metadata", async () => {
  await asUser(staff, async () => {
    await db.query("select public.admin_mutate('block',$1)", [
      JSON.stringify({ item_id: "P0-01-choice", blocked: true }),
    ]);
  });
  await db.exec("set role anon");
  try {
    expect(
      (await db.query("select item_id from public.content_blocks")).rows,
    ).toHaveLength(1);
    await expect(
      db.query("select created_by from public.content_blocks"),
    ).rejects.toThrow();
  } finally {
    await db.exec("reset role");
  }
});
it("reports isolate learner reads while staff can resolve with audit", async () => {
  await asUser(a, async () => {
    await db.query("select public.submit_report($1)", [
      JSON.stringify({
        unit_id: "P0-01",
        item_id: "P0-01",
        release: "3.0.0",
        category: "answer",
        text: "Please check this.",
      }),
    ]);
    expect(
      (await db.query("select * from public.user_reports")).rows,
    ).toHaveLength(1);
  });
  await asUser(b, async () =>
    expect(
      (await db.query("select * from public.user_reports")).rows,
    ).toHaveLength(0),
  );
  await asUser(staff, async () => {
    const rows = await db.query<{ id: string }>(
      "select id from public.user_reports",
    );
    await db.query("select public.admin_mutate('report',$1)", [
      JSON.stringify({ id: rows.rows[0].id, state: "resolved" }),
    ]);
    expect(
      (await db.query("select * from public.admin_audit")).rows.length,
    ).toBeGreaterThan(0);
  });
});
it("fair-use budget denies after four calls in the same minute", async () => {
  await asUser(a, async () => {
    for (let i = 0; i < 4; i++)
      expect(
        (await db.query<{ consume_ai: boolean }>("select public.consume_ai()"))
          .rows[0].consume_ai,
      ).toBe(true);
    expect(
      (await db.query<{ consume_ai: boolean }>("select public.consume_ai()"))
        .rows[0].consume_ai,
    ).toBe(false);
  });
});
it("daily user/site budgets reject without incrementing counters at either limit", async () => {
  for (const [userCount, globalCount] of [
    [20, 4],
    [0, 200],
  ]) {
    await db.exec(
      `delete from public.usage_counters; insert into public.usage_counters(scope,window_start,minute_start,minute_count,count) values ('${b}',current_date,date_trunc('minute',now()),0,${userCount}),('global',current_date,date_trunc('minute',now()),0,${globalCount});`,
    );
    await asUser(b, async () => {
      expect(
        (await db.query<{ consume_ai: boolean }>("select public.consume_ai()"))
          .rows[0].consume_ai,
      ).toBe(false);
      await expect(
        db.query("update public.usage_counters set count=0"),
      ).rejects.toThrow();
    });
    const rows = await db.query<{ scope: string; count: number }>(
      "select scope,count from public.usage_counters order by scope",
    );
    expect(rows.rows.find((r) => r.scope === b)?.count).toBe(userCount);
    expect(rows.rows.find((r) => r.scope === "global")?.count).toBe(
      globalCount,
    );
  }
  await db.exec("delete from public.usage_counters");
});
it("direct RPC rejects invalid JSON types and extra privileged fields", async () => {
  await asUser(b, async () => {
    await expect(
      db.query("select public.save_checkpoint($1,$2,$3)", [
        0,
        crypto.randomUUID(),
        JSON.stringify({ ...initialProgress, unit_id: null }),
      ]),
    ).rejects.toThrow("INVALID_STATE");
    await expect(
      db.query("select public.save_checkpoint($1,$2,$3)", [
        0,
        crypto.randomUUID(),
        JSON.stringify({ ...initialProgress, role: "owner" }),
      ]),
    ).rejects.toThrow("INVALID_STATE");
  });
});

it("checkpoint stores only minimal attempts; writing outcome stays ungraded", async () => {
  await asUser(b, async () => {
    const state = {
      ...initialProgress,
      attempts: [
        {
          id: crypto.randomUUID(),
          unit_id: "P0-01",
          activity_id: "P0-01-write",
          release: "3.0.0",
          outcome: null,
        },
      ],
    };
    await db.query("select public.save_checkpoint($1,$2,$3)", [
      0,
      crypto.randomUUID(),
      JSON.stringify(state),
    ]);
    const rows = await db.query<{ outcome: boolean | null }>(
      "select outcome from public.activity_attempts",
    );
    expect(rows.rows).toEqual([{ outcome: null }]);
  });
});

it("operator checksum bootstrap preserves learner data and denies anonymous/authenticated access", async () => {
  const before = (
    await db.query(
      "select user_id,revision,state from public.learner_paths order by user_id",
    )
  ).rows;
  await db.exec(
    readFileSync(
      "supabase/operations/migration_checksums_bootstrap.sql",
      "utf8",
    ),
  );
  await db.query(
    "insert into engjatra_ops.migration_checksums(version,sha256) values($1,$2)",
    ["202610090001", "a".repeat(64)],
  );
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try {
      await expect(
        db.query("select * from engjatra_ops.migration_checksums"),
      ).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  }
  expect(
    (
      await db.query(
        "select user_id,revision,state from public.learner_paths order by user_id",
      )
    ).rows,
  ).toEqual(before);
});
