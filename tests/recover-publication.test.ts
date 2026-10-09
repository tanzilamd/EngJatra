import { it, expect, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  trustedAncestor,
  automaticRecoveryAllowed,
  activeRelease,
  verifyPublicFiles,
} from "../scripts/recover-publication";
import { settings } from "../scripts/deployment-config";
const sha = "a".repeat(40);
const config = settings({
  VITE_SUPABASE_URL: "https://fixture.supabase.co",
  VITE_SUPABASE_ANON_KEY: "sb_publishable_fixture_only_12345",
  VITE_API_URL: "https://engjatra-api.fixture.workers.dev",
  CONTENT_URL: "https://engjatra.fixture.workers.dev",
  ALLOWED_ORIGINS:
    "https://engjatra.fixture.workers.dev,https://engjatra-admin.fixture.workers.dev",
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_API_TOKEN: "fixture-only-token",
});
it("recovery refuses non-main/future/fork source before any checkout", async () => {
  for (const status of ["behind", "diverged", undefined])
    await expect(
      trustedAncestor(sha, "b".repeat(40), async () => ({ status })),
    ).rejects.toThrow(/ancestor/);
  await trustedAncestor(sha, "b".repeat(40), async () => ({ status: "ahead" }));
  await expect(trustedAncestor("untrusted", sha)).rejects.toThrow(/Invalid/);
});
it("recovery chooses only a single fully active commit across all targets", async () => {
  const network = vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    return Response.json({
      success: true,
      result: path.endsWith("/subdomain")
        ? { subdomain: "fixture" }
        : path.endsWith("/deployments")
          ? {
              deployments: [
                { versions: [{ version_id: "fixture-id", percentage: 100 }] },
              ],
            }
          : { annotations: { "workers/tag": sha } },
    });
  });
  expect((await activeRelease(config, network)).commit).toBe(sha);
  const partial = vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    if (path.includes("/versions/") && path.includes("engjatra-admin"))
      return Response.json({
        success: true,
        result: { annotations: { "workers/tag": "b".repeat(40) } },
      });
    return network(input);
  });
  await expect(activeRelease(config, partial)).rejects.toThrow(
    /different source/,
  );
});
it("automatic recovery requires successful QA and a recognized failure, then limits retries per commit", async () => {
  const api = async (path: string) => {
    if (path.endsWith("/runs/1"))
      return { head_sha: sha, head_branch: "main", conclusion: "failure" };
    if (path.endsWith("/jobs"))
      return {
        jobs: [
          { name: "qa", id: 2, conclusion: "success", steps: [] },
          {
            name: "deploy",
            id: 3,
            conclusion: "failure",
            steps: [{ name: "Run npm run deploy:all", conclusion: "failure" }],
          },
        ],
      };
    if (path.includes("annotations"))
      return [
        {
          title: "EngJatra deployment blocked",
          message:
            "Published content exists but its retained artifact is missing",
        },
      ];
    return { artifacts: [] };
  };
  expect(await automaticRecoveryAllowed("1", api)).toBe(true);
  expect(
    await automaticRecoveryAllowed("1", async (path) =>
      path.endsWith("/jobs")
        ? { jobs: [{ name: "qa", conclusion: "failure" }] }
        : api(path),
    ),
  ).toBe(false);
  expect(
    await automaticRecoveryAllowed("1", async (path) =>
      path.includes("annotations")
        ? [
            {
              title: "EngJatra deployment blocked",
              message: "configuration missing",
            },
          ]
        : api(path),
    ),
  ).toBe(false);
  expect(
    await automaticRecoveryAllowed("1", async (path) =>
      path.includes("artifacts?")
        ? { artifacts: [{ expired: false, workflow_run: { head_sha: sha } }] }
        : api(path),
    ),
  ).toBe(false);
});
it("baseline certification checks binary/fonts and JS hashes, not only a healthy HTML page", async () => {
  const root = await mkdtemp(join(tmpdir(), "engjatra-public-files-"));
  try {
    await mkdir(`${root}/assets`);
    await writeFile(`${root}/index.html`, "approved homepage");
    await writeFile(`${root}/assets/font.woff2`, new Uint8Array([0, 255, 4]));
    await writeFile(`${root}/_headers`, "not a public asset");
    const network = vi.fn(
      async (input: RequestInfo | URL) =>
        new Response(
          new URL(String(input)).pathname === "/"
            ? "approved homepage"
            : new Uint8Array([0, 255, 4]),
        ),
    );
    expect(await verifyPublicFiles(root, config.student, network)).toBe(2);
    await expect(
      verifyPublicFiles(
        root,
        config.student,
        async () => new Response("approved homepage"),
      ),
    ).rejects.toThrow(/differs/);
    await symlink(`${root}/index.html`, `${root}/assets/unsafe-link`);
    await expect(
      verifyPublicFiles(root, config.student, network),
    ).rejects.toThrow(/symlink/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
