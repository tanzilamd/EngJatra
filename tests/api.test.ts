import { beforeEach, it, expect, vi } from "vitest";
import { handle } from "../workers/api/src/index";
import { authenticate } from "../workers/api/src/supabase";
import { demoState } from "../workers/api/src/demo";
import { initialProgress } from "../packages/contracts/api";
import type { Env } from "../workers/api/src/types";
const local: Env = {
  ENVIRONMENT: "local",
  LOCAL_DEMO: "true",
  ALLOWED_ORIGINS: "http://localhost:5173",
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  CONTENT_URL: "http://localhost:5173",
  GEMMA_FREE_CONFIRMED: "false",
  LLAMA_FREE_CONFIRMED: "false",
  GEMMA_MODEL: "",
  LLAMA_MODEL: "",
};
const request = (
  path: string,
  body?: unknown,
  role = "learner",
  user = "learner",
) =>
  new Request(`http://localhost:8787/api${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Local-Role": role,
      "X-Local-User": user,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
beforeEach(() => {
  demoState.snapshots.clear();
  demoState.receipts.clear();
  demoState.reports = [];
  demoState.drafts.clear();
  demoState.blocks.clear();
  demoState.releases = [];
});
it("production fails closed even with spoofed local role headers", async () => {
  expect(
    (
      await handle(request("/admin/session", undefined, "owner"), {
        ...local,
        ENVIRONMENT: "production",
      })
    ).status,
  ).toBe(503);
});
it("demo binding cannot bypass auth on a deployed hostname", async () => {
  expect(
    (
      await handle(
        new Request("https://engjatra.example/api/admin/session", {
          headers: { "X-Local-Role": "owner" },
        }),
        local,
      )
    ).status,
  ).toBe(503);
});
it("learners and forged unsupported roles cannot access admin", async () => {
  expect((await handle(request("/admin/overview"), local)).status).toBe(403);
  expect(
    (await handle(request("/admin/overview", undefined, "god"), local)).status,
  ).toBe(403);
});
it("reviewer cannot suspend content or prepare release", async () => {
  expect(
    (
      await handle(
        request(
          "/admin/block",
          { item_id: "P0-01", blocked: true },
          "content_reviewer",
        ),
        local,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await handle(
        request(
          "/admin/release",
          { id: "3.0.1", manifest_sha256: "a".repeat(64) },
          "content_editor",
        ),
        local,
      )
    ).status,
  ).toBe(403);
});
it("snapshot writes are idempotent and stale devices get server conflict", async () => {
  const body = {
    expected_revision: 0,
    idempotency_key: crypto.randomUUID(),
    state: { ...initialProgress, onboarded: true },
  };
  expect(
    (await handle(request("/learning/checkpoint", body), local)).status,
  ).toBe(200);
  const again = await (
    await handle(request("/learning/checkpoint", body), local)
  ).json();
  expect(again.revision).toBe(1);
  expect(
    (
      await handle(
        request("/learning/checkpoint", {
          ...body,
          idempotency_key: crypto.randomUUID(),
        }),
        local,
      )
    ).status,
  ).toBe(409);
});
it("local users are isolated", async () => {
  await handle(
    request("/learning/checkpoint", {
      expected_revision: 0,
      idempotency_key: crypto.randomUUID(),
      state: { ...initialProgress, unit_id: "B2-01" },
    }),
    local,
  );
  expect(
    (
      await (
        await handle(
          request("/learning/snapshot", undefined, "learner", "learner-two"),
          local,
        )
      ).json()
    ).state.unit_id,
  ).toBe("P0-01");
});
it("unknown fields and oversized bodies are rejected", async () => {
  expect(
    (
      await handle(
        request("/reports", {
          unit_id: "P0-01",
          item_id: "P0-01",
          release: "3.0.0",
          category: "answer",
          text: "A problem",
          role: "owner",
        }),
        local,
      )
    ).status,
  ).toBe(400);
  expect(
    (await handle(request("/reports", { text: "x".repeat(330000) }), local))
      .status,
  ).toBe(413);
});
it("reports reach staff; export strips private notes", async () => {
  await handle(
    request("/reports", {
      unit_id: "P0-01",
      item_id: "P0-01",
      release: "3.0.0",
      category: "answer",
      text: "Please check the key.",
    }),
    local,
  );
  const data = await (
    await handle(request("/admin/overview", undefined, "admin"), local)
  ).json();
  expect(data.reports).toHaveLength(1);
  expect(
    (await handle(request("/admin/export", undefined, "learner"), local))
      .status,
  ).toBe(403);
});
it("only minimal suspension IDs are public", async () => {
  await handle(
    request(
      "/admin/block",
      { item_id: "P0-01-choice", blocked: true },
      "admin",
    ),
    local,
  );
  expect(
    await (await handle(request("/content/blocked"), local)).json(),
  ).toEqual({ items: ["P0-01-choice"] });
});
it("hostile origins are refused", async () => {
  const r = request("/learning/snapshot");
  r.headers.set("Origin", "https://hostile.example");
  expect((await handle(r, local)).status).toBe(403);
});
it("remote auth uses the verified user and DB role, ignoring claimed admin headers", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: "11111111-1111-1111-1111-111111111111" }),
      ),
    )
    .mockResolvedValueOnce(new Response("[]"));
  const r = new Request("https://api.example/api/admin", {
    headers: {
      Authorization: "Bearer fake-test-token",
      "X-Local-Role": "owner",
    },
  });
  const identity = await authenticate(
    r,
    {
      ...local,
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "public-fixture",
    },
    fetcher,
  );
  expect(identity.role).toBe("learner");
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("reviewer can evaluate a draft without changing its public patch", async () => {
  const { readFileSync } = await import("node:fs");
  const { normalizeUnit } = await import("../scripts/content-tools");
  const unit = normalizeUnit(
    JSON.parse(readFileSync("content/units-public/P0/P0-01.json", "utf8")),
  );
  await handle(
    request(
      "/admin/draft",
      {
        unit_id: unit.id,
        release: "3.0.0",
        patch: unit,
        expected_revision: 0,
        admin_notes: "",
      },
      "content_editor",
    ),
    local,
  );
  expect(
    (
      await handle(
        request(
          "/admin/review",
          {
            unit_id: unit.id,
            review_status: "under_review",
            admin_notes: "Private review",
            expected_revision: 1,
          },
          "content_reviewer",
        ),
        local,
      )
    ).status,
  ).toBe(200);
  const out = await (
    await handle(request("/admin/export", undefined, "admin"), local)
  ).text();
  expect(out).not.toContain("Private review");
  expect(out).not.toContain("review_status");
});
it("production Worker export ignores runtime context as an injectable fetcher", async () => {
  const worker = (await import("../workers/api/src/index")).default;
  const response = await worker.fetch(
    new Request("https://api.example/api/health"),
    { ...local, ENVIRONMENT: "production", LOCAL_DEMO: undefined },
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ local_demo: false });
});
it("release verification uses bounded batches and rejects a tampered artifact", async () => {
  const { readFileSync } = await import("node:fs");
  const { sha } = await import("../scripts/content-tools");
  const raw = readFileSync(
    "apps/student-web/public/content/manifest.json",
    "utf8",
  );
  const network = vi.fn().mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname;
    return new Response(readFileSync(`apps/student-web/public${path}`));
  });
  const body = { id: "3.0.0", manifest_sha256: sha(raw), batch: 0 };
  const verified = await handle(
    request("/admin/verify", body, "admin"),
    local,
    network,
  );
  expect(verified.status).toBe(200);
  expect(network).toHaveBeenCalledTimes(25);
  expect(await verified.json()).toMatchObject({
    verified_batch: 0,
    requires_owner_record: true,
  });
  const bad = vi
    .fn()
    .mockResolvedValueOnce(new Response(raw))
    .mockResolvedValueOnce(new Response("{}"));
  expect(
    (await handle(request("/admin/verify", body, "admin"), local, bad)).status,
  ).toBe(409);
});
it("public Supabase REST uses API key auth without misusing a publishable key as a JWT", async () => {
  const { db } = await import("../workers/api/src/supabase");
  const network = vi.fn().mockResolvedValue(new Response("[]"));
  await db(
    {
      ...local,
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "public-test-fixture",
    },
    { id: "", token: "", role: "learner", demo: false },
    "content_blocks?select=item_id",
    undefined,
    "GET",
    network,
  );
  expect(network.mock.calls[0][1].headers.apikey).toBe("public-test-fixture");
  expect(network.mock.calls[0][1].headers.Authorization).toBeUndefined();
});
