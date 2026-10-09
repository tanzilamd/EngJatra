import { it, expect, vi } from "vitest";
import { rm, readFile } from "node:fs/promises";
import { settings } from "../scripts/deployment-config";
import {
  cloudRequest,
  verifyAccountOrigins,
} from "../scripts/deployment-verify";
import {
  gatewayDiagnostic,
  saveWranglerResult,
  publishWithRecovery,
  wranglerResult,
} from "../scripts/deployment-recovery";
const sha = "c".repeat(40);
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
it("gateway classification stores status and exit code without raw diagnostics", async () => {
  expect(gatewayDiagnostic("ERROR HTTP status: 504 private-canary")).toBe(504);
  expect(gatewayDiagnostic("503 Service Unavailable")).toBe(503);
  expect(gatewayDiagnostic("205504 assets uploaded")).toBeUndefined();
  expect(gatewayDiagnostic("HTTP 403 forbidden")).toBeUndefined();
  await saveWranglerResult(1, 504);
  expect(JSON.parse(await readFile(wranglerResult, "utf8"))).toEqual({
    exit_code: 1,
    gateway_status: 504,
  });
  await rm(wranglerResult, { force: true });
});
it("an accepted deployment followed by 504 is reconciled without repeating publishing", async () => {
  const publish = vi.fn(async () => {
    await saveWranglerResult(1, 504);
    throw Error("SDK failure");
  });
  const network = vi.fn(async (input: string | URL | Request) => {
    return Response.json({
      success: true,
      result: String(input).endsWith("/deployments")
        ? {
            deployments: [
              {
                versions: [{ version_id: "version-fixture", percentage: 100 }],
              },
            ],
          }
        : { annotations: { "workers/tag": sha } },
    });
  });
  expect(
    await publishWithRecovery(
      config,
      "engjatra",
      sha,
      publish,
      network,
      async () => {},
    ),
  ).toEqual({
    recovered: true,
    version: "version-fixture",
  });
  expect(publish).toHaveBeenCalledTimes(1);
  expect(network).toHaveBeenCalledTimes(2);
  expect(
    network.mock.calls.every(([input]) => !String(input).includes("secrets")),
  ).toBe(true);
  await rm(wranglerResult, { force: true });
});
it("uncertain gateway outcomes and another active commit stop without upload/rollback retries", async () => {
  const publish = vi.fn(async () => {
    await saveWranglerResult(1, 504);
    throw Error("SDK failure");
  });
  const network = vi.fn(async (input: string | URL | Request) =>
    Response.json({
      success: true,
      result: String(input).endsWith("/deployments")
        ? {
            deployments: [
              { versions: [{ version_id: "old-fixture", percentage: 100 }] },
            ],
          }
        : { annotations: { "workers/tag": "d".repeat(40) } },
    }),
  );
  await expect(
    publishWithRecovery(
      config,
      "engjatra",
      sha,
      publish,
      network,
      async () => {},
    ),
  ).rejects.toThrow(/uncertain.*No upload retry or rollback/);
  expect(publish).toHaveBeenCalledTimes(1);
  expect(network).toHaveBeenCalledTimes(6);
  await rm(wranglerResult, { force: true });
});
it("non-gateway failure never triggers recovery probes", async () => {
  const network = vi.fn();
  await saveWranglerResult(1);
  await expect(
    publishWithRecovery(
      config,
      "engjatra",
      sha,
      async () => {
        throw Error("strict conflict");
      },
      network,
    ),
  ).rejects.toThrow("strict conflict");
  expect(network).not.toHaveBeenCalled();
  await rm(wranglerResult, { force: true });
});
it("only idempotent Cloudflare reads retry transient gateway responses; permission denial stops", async () => {
  const network = vi
    .fn()
    .mockResolvedValueOnce(new Response("", { status: 504 }))
    .mockResolvedValueOnce(Response.json({ success: true, result: [] }));
  expect(await cloudRequest(config, "/workers/scripts", network)).toEqual([]);
  expect(network).toHaveBeenCalledTimes(2);
  for (const [, init] of network.mock.calls)
    expect(init.method).toBeUndefined();
  const denied = vi.fn(async () => new Response("", { status: 403 }));
  await expect(
    cloudRequest(config, "/workers/scripts", denied),
  ).rejects.toThrow(/403/);
  expect(denied).toHaveBeenCalledTimes(1);
});

it("account-derived Worker origins reject a wrong subdomain without publishing or overriding configuration", async () => {
  const network = vi.fn(async () =>
    Response.json({ success: true, result: { subdomain: "fixture" } }),
  );
  await verifyAccountOrigins(config, network);
  await expect(
    verifyAccountOrigins(
      { ...config, student: "https://engjatra.wrong-account.workers.dev" },
      network,
    ),
  ).rejects.toThrow(/do not match.*engjatra=\S*fixture.workers.dev/);
  expect(config.student).toBe("https://engjatra.fixture.workers.dev");
  expect(network).toHaveBeenCalledTimes(2);
  const missing = vi.fn(async () =>
    Response.json({ success: true, result: {} }),
  );
  await expect(verifyAccountOrigins(config, missing)).rejects.toThrow(
    /subdomain is unavailable/,
  );
});
