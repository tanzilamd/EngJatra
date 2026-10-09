import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { DeploymentConfig } from "./deployment-config";
import { verifyWorkerVersion, type Network } from "./deployment-verify";

export const wranglerResult = ".wrangler/wrangler-result.local.json";
// Only recognize a status in an error diagnostic; do not persist raw SDK output.
export function gatewayDiagnostic(line: string): number | undefined {
  const match = line.match(
    /(?:HTTP(?:\s+(?:error|status))?[\s:]+|status(?:\s+code)?[\s:=]+)(502|503|504)\b|\b(502|503|504)\s+(?:Bad Gateway|Service Unavailable|Gateway Time[- ]?out)\b/i,
  );
  return match ? Number(match[1] ?? match[2]) : undefined;
}
export async function saveWranglerResult(exitCode: number, gateway?: number) {
  await mkdir(".wrangler", { recursive: true });
  await writeFile(
    wranglerResult,
    JSON.stringify({ exit_code: exitCode, gateway_status: gateway ?? null }),
    { mode: 0o600 },
  );
}
export async function publishWithRecovery(
  config: DeploymentConfig,
  name: string,
  sha: string,
  publish: () => Promise<void>,
  network: Network = fetch,
  pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms)),
) {
  try {
    await publish();
    return { recovered: false };
  } catch (error) {
    let report: { exit_code?: number; gateway_status?: number } = {};
    try {
      report = JSON.parse(await readFile(wranglerResult, "utf8"));
    } catch {
      // Missing diagnostic cannot establish a transient gateway error.
    }
    if (
      !report.exit_code ||
      ![502, 503, 504].includes(report.gateway_status ?? 0)
    )
      throw error;
    // A timeout may follow acceptance. Read active versions; never repeat an
    // upload, secret write, rollback or SQL operation merely because it timed out.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await pause(1000);
      try {
        const version = await verifyWorkerVersion(config, name, sha, network);
        console.log(
          `${name}: gateway response reconciled with the active commit-tagged version; final artifact/security verification is still required`,
        );
        return { recovered: true, version };
      } catch {
        // Bounded reads may observe delayed activation. Failure is not proof
        // that nothing changed; preserve uncertainty and stop publishing.
      }
    }
    throw Error(
      `${name}: Cloudflare HTTP ${report.gateway_status}; deployment outcome remains uncertain. No upload retry or rollback was attempted. Use deploy:recover after read access/service health is restored; no complete deployment success is claimed.`,
      { cause: error },
    );
  }
}
