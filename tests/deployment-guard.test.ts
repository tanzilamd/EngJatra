import { it, expect, vi } from "vitest";
import {
  deploymentSnapshot,
  unchangedTarget,
} from "../scripts/deployment-guard";
import { settings } from "../scripts/deployment-config";
const config = settings({
  VITE_SUPABASE_URL: "https://test.supabase.co",
  VITE_SUPABASE_ANON_KEY: "sb_publishable_fixture_12345",
  VITE_API_URL: "https://engjatra-api.example.workers.dev",
  CONTENT_URL: "https://engjatra.example.workers.dev",
  ALLOWED_ORIGINS:
    "https://engjatra.example.workers.dev,https://engjatra-admin.example.workers.dev",
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_API_TOKEN: "fixture-only-token",
});
it("prevents replacement of newer/divergent or unknown production and preserves absent targets", async () => {
  const current = "b".repeat(40),
    next = "c".repeat(40);
  const network = vi.fn(
    async (url: RequestInfo | URL) =>
      new Response(
        JSON.stringify({
          success: true,
          result: String(url).endsWith("/workers/scripts")
            ? [{ id: "engjatra" }]
            : String(url).endsWith("/deployments")
              ? {
                  deployments: [
                    { versions: [{ version_id: "active", percentage: 100 }] },
                  ],
                }
              : { annotations: { "workers/tag": current } },
        }),
      ),
  );
  const api = vi.fn(async () => ({ status: "ahead" }));
  const snapshot = await deploymentSnapshot(config, next, network, api);
  expect(snapshot["engjatra-api"]).toBeNull();
  expect(snapshot.engjatra).toEqual({ id: "active", commit: current });
  await expect(
    deploymentSnapshot(
      config,
      next,
      network,
      vi.fn(async () => ({ status: "behind" })),
    ),
  ).rejects.toThrow(/no untrusted checkout or overwrite/);
  expect(() =>
    unchangedTarget(snapshot.engjatra, { id: "newer", commit: next }),
  ).toThrow(/changed during/);
  expect(() => unchangedTarget(null, snapshot.engjatra)).toThrow();
  expect(() =>
    unchangedTarget(snapshot.engjatra, snapshot.engjatra),
  ).not.toThrow();
});
