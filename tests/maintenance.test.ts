import { it, expect, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  deploymentIdle,
  verifiedRelease,
  monitor,
  type GitHub,
} from "../scripts/maintenance";
import {
  migrationFiles,
  checkManifest,
  planMigrations,
  remoteHistory,
  type History,
} from "../scripts/migrations";
import { logServerFailure } from "../workers/api/src/observability";
import { HttpError } from "../workers/api/src/supabase";
import { bands } from "../packages/learning/engine";
import { digest } from "../scripts/deployment-verify";
const sha = "b".repeat(40);
const env = {
  VITE_SUPABASE_URL: "https://fixture.supabase.co",
  VITE_SUPABASE_ANON_KEY: "sb_publishable_fixture_only_12345",
  VITE_API_URL: "https://engjatra-api.fixture.workers.dev",
  CONTENT_URL: "https://engjatra.fixture.workers.dev",
  ALLOWED_ORIGINS:
    "https://engjatra.fixture.workers.dev,https://engjatra-admin.fixture.workers.dev",
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_API_TOKEN: "fixture-only-token",
};
const idle: GitHub = async () => ({ workflow_runs: [] });
it("queued/environment-waiting deployments prevent probes and publishing without cancellation", async () => {
  const api = vi.fn(async (path: string) => ({
    workflow_runs: path.includes("status=waiting") ? [{ id: 1 }] : [],
  }));
  expect(await deploymentIdle(api)).toBe(false);
  const network = vi.fn();
  expect((await monitor("does-not-exist", sha, {}, api, network)).state).toBe(
    "deferred",
  );
  expect(network).not.toHaveBeenCalled();
  expect(api.mock.calls.every(([path]) => path.includes("/runs?"))).toBe(true);
});
it("failed/malformed GitHub activity cannot certify an idle deployment", async () => {
  await expect(deploymentIdle(async () => ({}))).rejects.toThrow(/Invalid/);
  await expect(
    deploymentIdle(async () => {
      throw Error("denied");
    }),
  ).rejects.toThrow(/denied/);
});
it("release selection rejects failed/stale/cross-branch archives and binds a successful main SHA", async () => {
  const artifact = (id: number) => ({
    id,
    name: "production-release",
    expired: false,
    workflow_run: { id, head_branch: "main", head_sha: sha },
  });
  const api: GitHub = async (path) =>
    path.includes("/artifacts?")
      ? {
          artifacts: [
            { ...artifact(1), expired: true },
            {
              ...artifact(2),
              workflow_run: { id: 2, head_branch: "other", head_sha: sha },
            },
            artifact(3),
            artifact(4),
          ],
        }
      : {
          id: path.endsWith("/3") ? 3 : 4,
          status: "completed",
          conclusion: path.endsWith("/3") ? "failure" : "success",
          head_branch: "main",
          head_sha: sha,
        };
  expect(await verifiedRelease(api)).toEqual({
    run_id: 4,
    artifact_id: 4,
    commit: sha,
  });
  await expect(
    verifiedRelease(async () => ({ artifacts: [] })),
  ).rejects.toThrow(/NOT VERIFIED/);
});
async function archive(root: string) {
  const body = '{"fixture":"public-only"}';
  const manifest = {
    version: "3.0.0",
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
    await writeFile(`${root}/apps/${service}/dist/index.html`, service);
  }
  const content = `${root}/apps/student-web/dist/content`;
  await mkdir(content, { recursive: true });
  await writeFile(`${content}/manifest.json`, JSON.stringify(manifest));
  for (const level of manifest.levels) {
    const dir = `${content}/3.0.0/${level.id}`;
    await mkdir(dir, { recursive: true });
    for (const unit of level.units)
      await writeFile(`${dir}/${unit.id}.json`, body);
    await writeFile(`${dir}/library.json`, body);
  }
  await mkdir(`${root}/.wrangler`, { recursive: true });
  await writeFile(
    `${root}/.wrangler/deployment-receipt.local.json`,
    JSON.stringify({
      commit: sha,
      versions: {
        engjatra: "version",
        "engjatra-admin": "version",
        "engjatra-api": "version",
      },
      verified_at: new Date().toISOString(),
    }),
  );
}
it("monitor verifies the archived deployed SHA rather than current main, and rejects drift", async () => {
  const root = await mkdtemp(join(tmpdir(), "engjatra-maintenance-"));
  try {
    await archive(root);
    let homepageMiss = true;
    const network = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.hostname === "api.cloudflare.com")
          return Response.json({
            success: true,
            result: url.pathname.endsWith("/workers/subdomain")
              ? { subdomain: "fixture" }
              : url.pathname.endsWith("/deployments")
                ? {
                    deployments: [
                      {
                        versions: [{ version_id: "version", percentage: 100 }],
                      },
                    ],
                  }
                : { annotations: { "workers/tag": sha } },
          });
        if (url.hostname === "fixture.supabase.co")
          return url.pathname.includes("rpc")
            ? new Response("", { status: 401 })
            : Response.json([]);
        if (url.origin === env.VITE_API_URL) {
          const origin = new Headers(init?.headers).get("Origin");
          if (origin === "https://untrusted.invalid")
            return new Response("", { status: 403 });
          if (
            url.pathname.includes("/admin/") ||
            url.pathname.includes("/learning/")
          )
            return new Response("", { status: 401 });
          return Response.json(
            url.pathname.endsWith("/health")
              ? { ok: true, local_demo: false }
              : { items: [] },
            { headers: { "Access-Control-Allow-Origin": env.CONTENT_URL } },
          );
        }
        if (
          url.origin === env.CONTENT_URL &&
          url.pathname === "/" &&
          homepageMiss
        ) {
          homepageMiss = false;
          return new Response("", { status: 404 });
        }
        const service =
          url.origin === env.CONTENT_URL ? "student-web" : "admin-web";
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
    expect((await monitor(root, sha, env, idle, network)).state).toBe(
      "verified",
    );
    expect(
      network.mock.calls.filter(([url]) =>
        /\/(P0|A1|A2|B1|B2|C1)-\d{2}\.json$/.test(String(url)),
      ),
    ).toHaveLength(96);
    await expect(
      monitor(root, "c".repeat(40), env, idle, network),
    ).rejects.toThrow(/receipt/);
    let calls = 0;
    const moving: GitHub = async () => ({
      workflow_runs: ++calls > 5 ? [{ id: 1 }] : [],
    });
    const broken = vi.fn(async () => Response.json({ success: false }));
    expect((await monitor(root, sha, env, moving, broken)).state).toBe(
      "deferred",
    );
    await expect(monitor(root, sha, env, idle, broken)).rejects.toThrow(
      /Cloudflare API/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
const history: History = {
  project_ref: "fixture",
  captured_at: new Date().toISOString(),
  migrations: [],
  application_tables: [],
  rls_disabled: [],
};
it("migration checksums reject modified SQL and duplicate versions; fresh plans preserve source", async () => {
  const root = await mkdtemp(join(tmpdir(), "engjatra-migrations-"));
  try {
    await mkdir(`${root}/supabase/migrations`, { recursive: true });
    const path = join(root, "supabase/migrations/202610100001_initial.sql");
    await writeFile(path, "create table public.fixture(id integer);");
    const files = await migrationFiles(root);
    await writeFile(
      `${root}/supabase/migration-manifest.json`,
      JSON.stringify({ migrations: files }),
    );
    expect((await checkManifest(root)).length).toBe(1);
    expect(planMigrations(files, history).pending).toEqual(files);
    await writeFile(path, "drop table public.fixture;");
    await expect(checkManifest(root)).rejects.toThrow(/checksum/);
    await writeFile(
      join(root, "supabase/migrations/202610100001_duplicate.sql"),
      "select 1;",
    );
    await expect(migrationFiles(root)).rejects.toThrow(/distinct/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("migration planning blocks untracked existing schema, edited history, missing hashes and RLS disablement", () => {
  const file = {
    version: "202610100001",
    name: "202610100001_initial.sql",
    sha256: "a".repeat(64),
  };
  expect(
    planMigrations([file], { ...history, application_tables: ["profiles"] })
      .state,
  ).toBe("blocked");
  expect(
    planMigrations([file], {
      ...history,
      migrations: [{ version: file.version }],
    }).blockers.join(),
  ).toMatch(/checksum/);
  expect(
    planMigrations([file], {
      ...history,
      migrations: [{ version: file.version, sha256: "b".repeat(64) }],
    }).state,
  ).toBe("blocked");
  expect(
    planMigrations([file], { ...history, rls_disabled: ["profiles"] }).state,
  ).toBe("blocked");
  expect(
    planMigrations([file], {
      ...history,
      migrations: [{ version: file.version, sha256: file.sha256 }],
    }).pending,
  ).toEqual([]);
});
it("live migration audit requests enforce read-only SQL, avoid learner rows and refuse denied/malformed responses", async () => {
  const network = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const { query, read_only } = JSON.parse(String(init?.body));
    expect(read_only).toBe(true);
    expect(query).not.toMatch(
      /select \*|insert |update |delete |drop |alter /i,
    );
    if (query.includes("pg_class"))
      return Response.json([{ name: "profiles", rls: true }]);
    if (query.includes("to_regclass"))
      return Response.json([{ present: true, checksums_present: true }]);
    if (query.includes("schema_migrations"))
      return Response.json([{ version: "202610090001" }]);
    return Response.json([{ version: "202610090001", sha256: "a".repeat(64) }]);
  });
  const result = await remoteHistory("fixture", "not-a-real-key", network);
  expect(result.migrations[0].sha256).toBe("a".repeat(64));
  await expect(
    remoteHistory(
      "fixture",
      "not-a-real-key",
      async () => new Response("private detail", { status: 403 }),
    ),
  ).rejects.toThrow(/HTTP 403/);
  await expect(
    remoteHistory("fixture", "not-a-real-key", async () =>
      Response.json({ unexpected: true }),
    ),
  ).rejects.toThrow(/Unsupported/);
});
it("server error logging retains only coarse route/status/time and ignores expected auth errors", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    logServerFailure(
      new Error("private learner text and secret credential"),
      "/api/history/private-user-id",
    );
    const record = JSON.parse(String(spy.mock.calls[0][0]));
    expect(Object.keys(record).sort()).toEqual([
      "at",
      "event",
      "route",
      "status",
    ]);
    expect(record.route).toBe("history");
    expect(JSON.stringify(record)).not.toMatch(/learner|secret|private-user/);
    logServerFailure(new HttpError(403, "FORBIDDEN"), "/api/admin/session");
    expect(spy).toHaveBeenCalledTimes(1);
  } finally {
    spy.mockRestore();
  }
});

it("malformed Management API responses never expose their body through diagnostics", async () => {
  const network = vi.fn(async () => new Response("private-canary-not-json"));
  await expect(
    remoteHistory("fixture", "fixture-token", network),
  ).rejects.toThrow("Unsupported Management API JSON; no response body logged");
});
