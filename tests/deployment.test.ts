import { it, expect, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  settings,
  publicKey,
  origin,
  inspectTargets,
  apiConfiguration,
  apiSecrets,
  type Settings,
} from "../scripts/deployment-config";
import {
  verifySupabase,
  verifySites,
  verifyVersions,
  digest,
} from "../scripts/deployment-verify";
import { preserveContent } from "../scripts/deployment-artifacts";
import { bands } from "../packages/learning/engine";
const input: Settings = {
  VITE_SUPABASE_URL: "https://test.supabase.co",
  VITE_SUPABASE_ANON_KEY: "sb_publishable_fixture_only_12345",
  VITE_API_URL: "https://engjatra-api.example.workers.dev",
  CONTENT_URL: "https://engjatra.example.workers.dev",
  ALLOWED_ORIGINS:
    "https://engjatra.example.workers.dev,https://engjatra-admin.example.workers.dev",
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_API_TOKEN: "fixture-only-token",
};
const config = settings(input);
it("reports all absent mandatory configuration without revealing supplied credentials", () => {
  expect(() => settings({})).toThrow(
    /VITE_SUPABASE_URL[\s\S]*CLOUDFLARE_API_TOKEN/,
  );
  expect(() =>
    settings({
      ...input,
      VITE_SUPABASE_ANON_KEY: [
        "sb",
        "secret",
        "fixture_should_never_be_public",
      ].join("_"),
    }),
  ).toThrow(/privileged\/session keys are forbidden/);
});
it("supports actual publishable naming and rejects privileged/learner JWTs", () => {
  const jwt = (role: string) =>
    `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
  expect(publicKey(input.VITE_SUPABASE_ANON_KEY)).toBe(
    input.VITE_SUPABASE_ANON_KEY,
  );
  expect(publicKey(jwt("anon"))).toBe(jwt("anon"));
  for (const role of ["service_role", "authenticated"])
    expect(() => publicKey(jwt(role))).toThrow();
});
it.each([
  "http://unsafe.example",
  "https://user:password@example.com",
  "https://example.com/path",
  "https://localhost",
  "https://example.com?key=x",
  "https://example.com#fragment",
])("rejects unsafe production origin %s", (value) =>
  expect(() => origin(value, "URL")).toThrow(),
);
it("rejects wrong Worker targets, duplicate origins, and split project keys", () => {
  expect(() => settings({ ...input, VITE_API_URL: input.CONTENT_URL })).toThrow(
    /separate origin/,
  );
  expect(() =>
    settings({ ...input, VITE_API_URL: "https://wrong.example.workers.dev" }),
  ).toThrow(/Worker name/);
  expect(() =>
    settings({
      ...input,
      ALLOWED_ORIGINS: `${input.CONTENT_URL},${input.CONTENT_URL}`,
    }),
  ).toThrow(/separate admin/);
  expect(() =>
    settings({ ...input, SUPABASE_ANON_KEY: "different-key" }),
  ).toThrow(/conflicts/);
  expect(() => settings({ ...input, LOCAL_DEMO: "true" })).toThrow(/conflicts/);
});
it("AI stays off without claims; enabled provider needs both compatible model and secret", () => {
  expect(config.gemma.enabled).toBe(false);
  expect(config.llama.enabled).toBe(false);
  expect(() => settings({ ...input, GEMMA_FREE_CONFIRMED: "true" })).toThrow(
    /GEMMA_MODEL[\s\S]*GEMMA_API_KEY/,
  );
  expect(() => settings({ ...input, LLAMA_FREE_CONFIRMED: "yes" })).toThrow(
    /true or false/,
  );
  expect(
    settings({
      ...input,
      LLAMA_FREE_CONFIRMED: "true",
      LLAMA_MODEL: "llama-test",
      LLAMA_API_KEY: "fixture",
    }).llama.enabled,
  ).toBe(true);
});
it("keeps secret values outside runtime config and supplies conservative production bindings", () => {
  const generated = apiConfiguration(config);
  expect(generated).toMatchObject({
    name: "engjatra-api",
    compatibility_flags: ["global_fetch_strictly_public"],
    keep_vars: true,
    vars: {
      LOCAL_DEMO: "false",
      ENVIRONMENT: "production",
      GEMMA_FREE_CONFIRMED: "false",
    },
  });
  expect(JSON.stringify(generated)).not.toContain(config.publicKey);
  expect(apiSecrets(config)).toEqual({ SUPABASE_ANON_KEY: config.publicKey });
});
it("checked-in configs resolve to independent static and API targets", async () => {
  await expect(inspectTargets()).resolves.toBeUndefined();
});
it("rejects an API configuration that cannot fetch same-zone public learning assets", async () => {
  const root = await mkdtemp(join(tmpdir(), "engjatra-public-fetch-"));
  try {
    await mkdir(join(root, "workers/api"), { recursive: true });
    await mkdir(join(root, "apps/admin-web"), { recursive: true });
    await cp("wrangler.jsonc", join(root, "wrangler.jsonc"));
    await cp(
      "apps/admin-web/wrangler.jsonc",
      join(root, "apps/admin-web/wrangler.jsonc"),
    );
    const raw = await readFile("workers/api/wrangler.toml", "utf8");
    await writeFile(
      join(root, "workers/api/wrangler.toml"),
      raw.replace(/^compatibility_flags.*\n/m, ""),
    );
    await expect(inspectTargets(root)).rejects.toThrow(/public-fetch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("Supabase readiness requires public schema and negative anonymous RPC", async () => {
  const network = vi
    .fn()
    .mockResolvedValueOnce(new Response("[]"))
    .mockResolvedValueOnce(new Response("", { status: 401 }));
  await verifySupabase(config, network);
  expect(network.mock.calls[0][1].headers.apikey).toBe(config.publicKey);
  expect(network.mock.calls[0][1].headers.Authorization).toBeUndefined();
  await expect(
    verifySupabase(config, vi.fn().mockResolvedValue(new Response("[]"))),
  ).rejects.toThrow(/must be denied/);
});
it("Cloudflare proof requires one active version at 100% with exact commit tag", async () => {
  const network = vi.fn(
    async (url: RequestInfo | URL) =>
      new Response(
        JSON.stringify({
          success: true,
          result: String(url).endsWith("/deployments")
            ? {
                deployments: [
                  { versions: [{ version_id: "version", percentage: 100 }] },
                ],
              }
            : { annotations: { "workers/tag": "expected-commit" } },
        }),
      ),
  );
  expect(
    Object.keys(await verifyVersions(config, "expected-commit", network)),
  ).toHaveLength(3);
  expect(network).toHaveBeenCalledTimes(6);
  await expect(verifyVersions(config, "wrong-commit", network)).rejects.toThrow(
    /not tagged/,
  );
});
async function fixture(root: string, version = "3.0.0") {
  const body = '{"public":"teaching"}';
  const manifest = {
    version,
    levels: bands.map((id) => ({
      id,
      name_bn: "ধাপ",
      goal: "লক্ষ্য",
      units: Array.from({ length: 16 }, (_, i) => ({
        id: `${id}-${String(i + 1).padStart(2, "0")}`,
        title_bn: "পাঠ",
        goal_bn: "লক্ষ্য",
        sha256: digest(body),
      })),
    })),
  };
  for (const service of ["student-web", "admin-web"]) {
    await mkdir(`${root}/apps/${service}/dist`, { recursive: true });
    await writeFile(
      `${root}/apps/${service}/dist/index.html`,
      `<html>${service}</html>`,
    );
  }
  const out = `${root}/apps/student-web/dist`;
  await mkdir(`${out}/content/${version}`, { recursive: true });
  await writeFile(`${out}/content/manifest.json`, JSON.stringify(manifest));
  await writeFile(`${out}/_headers`, "/*\n  X-Frame-Options: DENY\n");
  for (const level of manifest.levels) {
    await mkdir(`${out}/content/${version}/${level.id}`, { recursive: true });
    for (const unit of level.units)
      await writeFile(
        `${out}/content/${version}/${level.id}/${unit.id}.json`,
        body,
      );
    await writeFile(`${out}/content/${version}/${level.id}/library.json`, body);
  }
  return out;
}
it("site verification checks hashes for both SPA shells, all 96 units, libraries and negative API cases", async () => {
  const root = await mkdtemp(join(tmpdir(), "engjatra-deploy-"));
  try {
    const out = await fixture(root);
    const network = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.origin === config.api) {
          if (
            new Headers(init?.headers).get("Origin") ===
            "https://untrusted.invalid"
          )
            return new Response("", { status: 403 });
          if (
            ["/api/admin/session", "/api/learning/snapshot"].includes(
              url.pathname,
            )
          )
            return new Response("", { status: 401 });
          return new Response(
            JSON.stringify(
              url.pathname === "/api/health"
                ? { ok: true, local_demo: false }
                : { items: [] },
            ),
            { headers: { "Access-Control-Allow-Origin": config.student } },
          );
        }
        const service =
          url.origin === config.student ? "student-web" : "admin-web";
        const path = url.pathname.startsWith("/content/")
          ? url.pathname
          : "/index.html";
        return new Response(
          await readFile(`${root}/apps/${service}/dist${path}`, "utf8"),
          {
            headers: {
              "X-Frame-Options": "DENY",
              "Content-Security-Policy": "frame-ancestors 'none'",
            },
          },
        );
      },
    );
    await verifySites(config, network, root);
    expect(
      network.mock.calls.filter(([url]) =>
        /\/(P0|A1|A2|B1|B2|C1)-\d{2}\.json$/.test(String(url)),
      ),
    ).toHaveLength(96);
    expect(
      network.mock.calls.filter(([url]) =>
        String(url).endsWith("/library.json"),
      ),
    ).toHaveLength(6);
    await writeFile(`${out}/index.html`, "wrong deploy");
    await expect(
      verifySites(
        config,
        vi
          .fn()
          .mockResolvedValue(
            new Response("stale", { headers: { "X-Frame-Options": "DENY" } }),
          ),
        root,
      ),
    ).rejects.toThrow(/differs/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("retains all immutable prior content; rejects changes to an existing version and avoids release downgrade", async () => {
  const root = await mkdtemp(join(tmpdir(), "engjatra-retain-"));
  try {
    const base = await fixture(`${root}/base`, "3.0.1");
    const out = await fixture(`${root}/current`, "3.0.0");
    await preserveContent(base, out);
    expect(
      JSON.parse(await readFile(`${out}/content/manifest.json`, "utf8"))
        .version,
    ).toBe("3.0.1");
    expect(
      await readFile(`${out}/content/3.0.0/P0/P0-01.json`, "utf8"),
    ).toContain("teaching");
    expect(
      await readFile(`${out}/content/3.0.1/P0/P0-01.json`, "utf8"),
    ).toContain("teaching");
    const copy = `${root}/copy`;
    await cp(out, copy, { recursive: true });
    await writeFile(`${out}/content/3.0.1/P0/P0-01.json`, "changed");
    await expect(preserveContent(copy, out)).rejects.toThrow(
      /Immutable content changed/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("artifact secret scan permits public legacy anon keys and rejects private/session tokens", async () => {
  const { scanPublicText } = await import("../scripts/public-security");
  const jwt = (role: string) =>
    `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.fixture_signature`;
  expect(() => scanPublicText(jwt("anon"))).not.toThrow();
  for (const role of ["service_role", "authenticated"])
    expect(() => scanPublicText(jwt(role))).toThrow(/Non-public JWT/);
  expect(() => scanPublicText(["sb", "secret", "fixture"].join("_"))).toThrow(
    /private credential/,
  );
});
it("Wrangler console output redacts known credentials and recognizable remote keys", async () => {
  const { redactLog } = await import("../scripts/redact-log");
  expect(
    redactLog("binding: private-fixture-token", {
      GEMMA_API_KEY: "private-fixture-token",
    }),
  ).toBe("binding: [redacted]");
  const key = ["gsk", "a".repeat(24)].join("_");
  expect(redactLog(`remote: ${key}`, {})).toBe("remote: [redacted]");
  expect(
    redactLog(
      'locator.fill("disposable-password-canary"); HTTP 503 opaque-admin-canary',
      {},
      ["disposable-password-canary", "opaque-admin-canary", ""],
    ),
  ).toBe('locator.fill("[redacted]"); HTTP 503 [redacted]');
});

it("QA proof detects edits during checks and rejects stale source/commit evidence", async () => {
  const { recordStart, recordProof, proofCurrent } =
    await import("../scripts/qa-proof");
  const root = await mkdtemp(join(tmpdir(), "engjatra-proof-"));
  try {
    execFileSync("git", ["init", "-q", "-b", "main", root]);
    await writeFile(`${root}/.gitignore`, ".wrangler/\n");
    await writeFile(`${root}/source.txt`, "original");
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "-qm",
        "fixture",
      ],
      { cwd: root },
    );
    await recordStart(root);
    await writeFile(`${root}/source.txt`, "changed while testing");
    await expect(recordProof(root)).rejects.toThrow(/changed during QA/);
    await recordStart(root);
    await recordProof(root);
    expect(await proofCurrent(root)).toBe(true);
    await writeFile(`${root}/source.txt`, "changed after testing");
    expect(await proofCurrent(root)).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
