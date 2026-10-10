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
        JSON.stringify({
          id: "11111111-1111-1111-1111-111111111111",
          email_confirmed_at: "2026-10-10T00:00:00Z",
        }),
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
it("unconfirmed remote users cannot enter protected APIs, while provider-confirmed Google users can", async () => {
  const env = {
    ...local,
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "public-fixture",
  };
  const req = new Request("https://api.example/api/learning/snapshot", {
    headers: { Authorization: "Bearer test-token" },
  });
  const unconfirmed = vi.fn().mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        id: "11111111-1111-1111-1111-111111111111",
        app_metadata: { provider: "email" },
      }),
    ),
  );
  await expect(authenticate(req, env, unconfirmed)).rejects.toMatchObject({
    status: 401,
  });
  expect(unconfirmed).toHaveBeenCalledTimes(1);
  const google = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "11111111-1111-1111-1111-111111111111",
          email_confirmed_at: "2026-10-10T00:00:00Z",
          app_metadata: { provider: "google" },
        }),
      ),
    )
    .mockResolvedValueOnce(new Response("[]"));
  expect((await authenticate(req, env, google)).role).toBe("learner");
});
it("disabled production AI does not consume learner or global inference quota", async () => {
  const { readFileSync } = await import("node:fs");
  const network = vi.fn().mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/auth/v1/user")
      return new Response(
        JSON.stringify({
          id: "11111111-1111-1111-1111-111111111111",
          email_confirmed_at: "2026-10-10T00:00:00Z",
        }),
      );
    if (path.endsWith("P0-01.json"))
      return new Response(
        readFileSync("apps/student-web/public/content/3.0.0/P0/P0-01.json"),
      );
    return new Response("[]");
  });
  const response = await handle(
    new Request("https://api.example/api/ai/tutor", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        unit_id: "P0-01",
        release: "3.0.0",
        text: "Hello",
      }),
    }),
    {
      ...local,
      ENVIRONMENT: "production",
      LOCAL_DEMO: undefined,
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "public-fixture",
      CONTENT_URL: "https://student.example",
    },
    network,
  );
  expect(await response.json()).toMatchObject({
    error: "AI_PROVIDER_UNCONFIGURED",
  });
  expect(
    network.mock.calls.some(([url]) => String(url).includes("consume_ai")),
  ).toBe(false);
});

it("enabled AI rejects missing consent, private context and unavailable trusted region before inference or quota consumption", async () => {
  const { readFileSync } = await import("node:fs");
  const network = vi.fn().mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/auth/v1/user")
      return new Response(
        JSON.stringify({
          id: "11111111-1111-1111-1111-111111111111",
          email_confirmed_at: "2026-10-10T00:00:00Z",
        }),
      );
    if (path.endsWith("P0-01.json"))
      return new Response(
        readFileSync("apps/student-web/public/content/3.0.0/P0/P0-01.json"),
      );
    return new Response("[]");
  });
  const env = {
    ...local,
    ENVIRONMENT: "production",
    LOCAL_DEMO: undefined,
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "public-fixture",
    CONTENT_URL: "https://student.example",
    GEMMA_FREE_CONFIRMED: "true",
    GEMMA_MODEL: "gemma-test",
    GEMMA_API_KEY: "private-fixture",
    GEMMA_ALLOWED_COUNTRIES: "BD",
  };
  for (const [payload, country, error] of [
    [{ ai_consent: false }, "BD", "AI_CONSENT_REQUIRED"],
    [
      {
        ai_consent: true,
        context: [{ role: "user", text: "My email is learner@example.com" }],
      },
      "BD",
      "AI_PRIVATE_INPUT",
    ],
    [{ ai_consent: true }, "GB", "AI_REGION_UNAVAILABLE"],
    [{ ai_consent: true }, undefined, "AI_REGION_UNAVAILABLE"],
  ] as const) {
    const req = new Request("https://api.example/api/ai/tutor", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
        "CF-IPCountry": "BD",
      },
      body: JSON.stringify({
        unit_id: "P0-01",
        release: "3.0.0",
        text: "Hello",
        ...payload,
      }),
    });
    Object.assign(req, { cf: { country } });
    const body = await (await handle(req, env, network)).json();
    expect(body).toMatchObject({
      error,
    });
    if (error === "AI_REGION_UNAVAILABLE")
      expect(body.country).toBe(country ?? "unknown");
  }
  expect(
    network.mock.calls.some(
      ([url]) =>
        String(url).includes("consume_ai") ||
        String(url).includes("googleapis.com"),
    ),
  ).toBe(false);
});

it("consented authenticated AI in a selected trusted country consumes one budget and returns a validated provider reply", async () => {
  const { readFileSync } = await import("node:fs");
  const reply = {
    assistant_reply_en: "Hello!",
    short_explanation_bn: "ভালো শুরু।",
    feedback_type: "none",
    suggested_revision_en: null,
    next_question_en: "How are you?",
    learning_tags: ["writing"],
    source_unit_id: "P0-01",
  };
  const network = vi.fn().mockImplementation(async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user")
      return new Response(
        JSON.stringify({
          id: "11111111-1111-1111-1111-111111111111",
          email_confirmed_at: "2026-10-10T00:00:00Z",
        }),
      );
    if (url.pathname.endsWith("P0-01.json"))
      return new Response(
        readFileSync("apps/student-web/public/content/3.0.0/P0/P0-01.json"),
      );
    if (url.pathname.endsWith("consume_ai")) return new Response("true");
    if (url.hostname === "generativelanguage.googleapis.com")
      return new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(reply) }] } },
          ],
        }),
      );
    return new Response("[]");
  });
  const req = new Request("https://api.example/api/ai/tutor", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      unit_id: "P0-01",
      release: "3.0.0",
      text: "Hello",
      ai_consent: true,
    }),
  });
  Object.assign(req, { cf: { country: "BD" } });
  const response = await handle(
    req,
    {
      ...local,
      ENVIRONMENT: "production",
      LOCAL_DEMO: undefined,
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "public-fixture",
      CONTENT_URL: "https://student.example",
      GEMMA_FREE_CONFIRMED: "true",
      GEMMA_MODEL: "gemma-test",
      GEMMA_API_KEY: "private-fixture",
      GEMMA_ALLOWED_COUNTRIES: "BD",
    },
    network,
  );
  expect(await response.json()).toEqual({ reply });
  expect(
    network.mock.calls.filter(([url]) => String(url).includes("consume_ai")),
  ).toHaveLength(1);
  expect(
    network.mock.calls.filter(([url]) =>
      String(url).includes("googleapis.com"),
    ),
  ).toHaveLength(1);
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
  const body = {
    id: JSON.parse(raw).version,
    manifest_sha256: sha(raw),
    batch: 0,
  };
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
  expect(
    (
      await handle(
        request("/admin/verify", { ...body, id: "2.0.0" }, "admin"),
        local,
        network,
      )
    ).status,
  ).toBe(409);
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
