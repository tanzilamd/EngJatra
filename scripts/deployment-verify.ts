import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Manifest } from "../packages/contracts/content";
import type { DeploymentConfig } from "./deployment-config";
export type Network = typeof fetch;
export const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
const pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
async function get(
  url: string,
  network: Network,
  init?: RequestInit,
  retry404 = false,
) {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await network(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (
      !(
        [502, 503, 504].includes(response.status) ||
        (retry404 && response.status === 404)
      ) ||
      attempt === 2
    )
      break;
    await new Promise<void>((done) => setTimeout(done, 1000));
  }
  if (!response?.ok)
    throw Error(
      `Verification HTTP ${response?.status ?? "unknown"}: ${new URL(url).origin}${new URL(url).pathname}`,
    );
  return response;
}

// Mutable public URLs can briefly serve the previous artifact after an accepted
// upload. Revalidate the same URL with bounded reads, never republish or accept
// the stale body. Persistent mismatch remains a hard release failure.
export async function matchingPublicText(
  url: string,
  expected: string,
  network: Network = fetch,
  wait: (ms: number) => Promise<void> = pause,
) {
  const backoff = [2000, 4000, 8000, 16000];
  for (let attempt = 0; attempt <= backoff.length; attempt++) {
    const response = await get(url, network, { cache: "no-cache" }, true);
    if (digest(await response.text()) === digest(expected)) return response;
    if (attempt < backoff.length) await wait(backoff[attempt]);
  }
  const target = new URL(url);
  throw Error(
    `Published artifact differs after bounded revalidation: ${target.origin}${target.pathname}`,
  );
}
export async function verifySupabase(
  config: DeploymentConfig,
  network: Network = fetch,
) {
  const response = await get(
    `${config.supabase}/rest/v1/content_blocks?select=item_id&limit=1`,
    network,
    { headers: { apikey: config.publicKey } },
  );
  if (!Array.isArray(await response.json()))
    throw Error(
      "Supabase public blocklist schema unavailable; verify project key and migration",
    );
  const privateRead = await network(
    `${config.supabase}/rest/v1/rpc/read_snapshot`,
    {
      method: "POST",
      headers: { apikey: config.publicKey, "Content-Type": "application/json" },
      body: "{}",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (![401, 403].includes(privateRead.status))
    throw Error("Anonymous private checkpoint RPC must be denied");
}
export async function verifySites(
  config: DeploymentConfig,
  network: Network = fetch,
  root = ".",
  wait: (ms: number) => Promise<void> = pause,
) {
  for (const [service, base] of [
    ["student", config.student],
    ["admin", config.admin],
  ]) {
    const expected = await readFile(
      `${root}/apps/${service === "student" ? "student-web" : "admin-web"}/dist/index.html`,
      "utf8",
    );
    for (const path of ["/", "/learn"]) {
      const response = await matchingPublicText(
        `${base}${path}`,
        expected,
        network,
        wait,
      );
      if (
        response.headers.get("X-Frame-Options") !== "DENY" ||
        !response.headers
          .get("Content-Security-Policy")
          ?.includes("frame-ancestors 'none'")
      )
        throw Error(`${service}: security headers missing`);
    }
  }
  const raw = await readFile(
    `${root}/apps/student-web/dist/content/manifest.json`,
    "utf8",
  );
  await matchingPublicText(
    `${config.student}/content/manifest.json`,
    raw,
    network,
    wait,
  );
  const manifest = Manifest.parse(JSON.parse(raw));
  const units = manifest.levels.flatMap((level) =>
    level.units.map((unit) => ({ ...unit, band: level.id })),
  );
  // Bounded batches, static asset requests do not invoke the API Worker.
  for (let start = 0; start < units.length; start += 8)
    await Promise.all(
      units.slice(start, start + 8).map(async (unit) => {
        const response = await get(
          `${config.student}/content/${manifest.version}/${unit.band}/${unit.id}.json`,
          network,
        );
        if (digest(await response.text()) !== unit.sha256)
          throw Error(`Published unit hash mismatch: ${unit.id}`);
      }),
    );
  for (const level of manifest.levels) {
    const path = `/content/${manifest.version}/${level.id}/library.json`;
    if (
      digest(await (await get(`${config.student}${path}`, network)).text()) !==
      digest(await readFile(`${root}/apps/student-web/dist${path}`, "utf8"))
    )
      throw Error(`Published library mismatch: ${level.id}`);
  }
  const health = await get(`${config.api}/api/health`, network, {
    headers: { Origin: config.student },
  });
  const marker = (await health.json()) as {
    ok?: boolean;
    local_demo?: boolean;
  };
  if (
    !marker.ok ||
    marker.local_demo !== false ||
    health.headers.get("Access-Control-Allow-Origin") !== config.student
  )
    throw Error("API health/demo/CORS validation failed");
  const blocked = await get(`${config.api}/api/content/blocked`, network, {
    headers: { Origin: config.student },
  });
  if (!Array.isArray(((await blocked.json()) as { items?: unknown }).items))
    throw Error("API blocklist unavailable");
  for (const path of ["/api/admin/session", "/api/learning/snapshot"]) {
    const response = await network(`${config.api}${path}`, {
      headers: {
        Origin: config.admin,
        "X-Local-User": "owner",
        "X-Local-Role": "owner",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (![401, 403].includes(response.status))
      throw Error("Unauthenticated/spoofed private API access must be denied");
  }
  const forbidden = await network(`${config.api}/api/health`, {
    headers: { Origin: "https://untrusted.invalid" },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (
    forbidden.status !== 403 ||
    forbidden.headers.has("Access-Control-Allow-Origin")
  )
    throw Error("Untrusted CORS origin accepted");
}
export async function cloudRequest(
  config: DeploymentConfig,
  path: string,
  network: Network = fetch,
) {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await network(
      `https://api.cloudflare.com/client/v4/accounts/${config.account}${path}`,
      {
        headers: { Authorization: `Bearer ${config.token}` },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (![502, 503, 504].includes(response.status) || attempt === 2) break;
    await new Promise<void>((done) => setTimeout(done, 500));
  }
  if (!response?.ok)
    throw Error(
      `Cloudflare read-only verification HTTP ${response?.status ?? "unknown"}; no deployment success is claimed`,
    );
  const result = (await response.json()) as {
    success: boolean;
    result: unknown;
  };
  if (!result.success)
    throw Error(
      "Cloudflare API verification denied; check scoped token permissions",
    );
  return result.result;
}
export async function verifyWorkerVersion(
  config: DeploymentConfig,
  name: string,
  sha: string,
  network: Network = fetch,
) {
  const deployment = (await cloudRequest(
    config,
    `/workers/scripts/${name}/deployments`,
    network,
  )) as {
    deployments?: { versions?: { version_id: string; percentage: number }[] }[];
  };
  const current = deployment?.deployments?.[0]?.versions;
  if (
    !current ||
    current.length !== 1 ||
    current[0].percentage !== 100 ||
    !current[0].version_id
  )
    throw Error(`${name}: expected a single active production version`);
  const version = (await cloudRequest(
    config,
    `/workers/scripts/${name}/versions/${current[0].version_id}`,
    network,
  )) as { annotations?: Record<string, string> };
  if (version?.annotations?.["workers/tag"] !== sha)
    throw Error(`${name}: active version is not tagged with this commit`);
  return current[0].version_id;
}
export async function verifyVersions(
  config: DeploymentConfig,
  sha: string,
  network: Network = fetch,
) {
  const result: Record<string, string> = {};
  for (const name of ["engjatra-api", "engjatra", "engjatra-admin"])
    result[name] = await verifyWorkerVersion(config, name, sha, network);
  return result;
}

export async function verifyAccountOrigins(
  config: DeploymentConfig,
  network: Network = fetch,
) {
  const origins = [
    ["engjatra", config.student],
    ["engjatra-admin", config.admin],
    ["engjatra-api", config.api],
  ];
  if (!origins.some(([, value]) => value.endsWith(".workers.dev"))) return;
  const account = (await cloudRequest(
    config,
    "/workers/subdomain",
    network,
  )) as { subdomain?: string };
  if (
    !account ||
    typeof account.subdomain !== "string" ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(account.subdomain)
  )
    throw Error(
      "Cloudflare account workers.dev subdomain is unavailable; no origin or deployment success is claimed",
    );
  const wrong = origins.filter(
    ([name, value]) =>
      value.endsWith(".workers.dev") &&
      value !== `https://${name}.${account.subdomain}.workers.dev`,
  );
  if (wrong.length)
    throw Error(
      `Configured workers.dev origins do not match the authorized account. Correct public origins: ${origins.map(([name]) => `${name}=https://${name}.${account.subdomain}.workers.dev`).join(", ")}. No automatic URL override or publishing was performed; update matching CI/CORS/Auth configuration through authorized settings.`,
    );
}
