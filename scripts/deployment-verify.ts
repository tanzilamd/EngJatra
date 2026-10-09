import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Manifest } from "../packages/contracts/content";
import type { DeploymentConfig } from "./deployment-config";
export type Network = typeof fetch;
export const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
async function get(url: string, network: Network, init?: RequestInit) {
  const response = await network(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw Error(
      `Verification HTTP ${response.status}: ${new URL(url).pathname}`,
    );
  return response;
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
      const response = await get(`${base}${path}`, network);
      if (digest(await response.text()) !== digest(expected))
        throw Error(
          `${service}: deployed HTML differs from validated artifact or SPA refresh failed`,
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
  const remote = await get(`${config.student}/content/manifest.json`, network);
  if (digest(await remote.text()) !== digest(raw))
    throw Error("Published content manifest differs from validated build");
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
  const response = await get(
    `https://api.cloudflare.com/client/v4/accounts/${config.account}${path}`,
    network,
    { headers: { Authorization: `Bearer ${config.token}` } },
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
export async function verifyVersions(
  config: DeploymentConfig,
  sha: string,
  network: Network = fetch,
) {
  const result: Record<string, string> = {};
  for (const name of ["engjatra-api", "engjatra", "engjatra-admin"]) {
    const deployment = (await cloudRequest(
      config,
      `/workers/scripts/${name}/deployments`,
      network,
    )) as {
      deployments: { versions: { version_id: string; percentage: number }[] }[];
    };
    const current = deployment.deployments[0]?.versions;
    if (!current || current.length !== 1 || current[0].percentage !== 100)
      throw Error(`${name}: expected a single active production version`);
    const version = (await cloudRequest(
      config,
      `/workers/scripts/${name}/versions/${current[0].version_id}`,
      network,
    )) as { annotations?: Record<string, string> };
    if (version.annotations?.["workers/tag"] !== sha)
      throw Error(`${name}: active version is not tagged with this commit`);
    result[name] = current[0].version_id;
  }
  return result;
}
