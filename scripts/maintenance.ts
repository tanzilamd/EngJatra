import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir, appendFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { settings } from "./deployment-config";
import {
  verifySites,
  verifySupabase,
  verifyVersions,
  type Network,
} from "./deployment-verify";
import { redactLog } from "./redact-log";

type Run = {
  id: number;
  status: string;
  conclusion: string | null;
  head_sha: string;
  head_branch: string;
  html_url?: string;
};
type Artifact = {
  id: number;
  name: string;
  expired: boolean;
  workflow_run?: { id: number; head_branch: string; head_sha: string };
};
export type GitHub = (path: string) => Promise<unknown>;
const repository = "tanzilamd/EngJatra";
const execute = promisify(execFile);
export const github: GitHub = async (path) => {
  try {
    const { stdout } = await execute("gh", ["api", path], {
      maxBuffer: 4 * 1024 * 1024,
      timeout: 20000,
    });
    return JSON.parse(stdout);
  } catch {
    throw Error(
      "GitHub API audit unavailable; no permission or idle-state success is claimed",
    );
  }
};
export async function deploymentIdle(api: GitHub = github) {
  // Includes manual/queued/environment-waiting runs. Never cancel or rerun anything.
  for (const status of [
    "in_progress",
    "queued",
    "waiting",
    "pending",
    "requested",
  ]) {
    const result = (await api(
      `repos/${repository}/actions/workflows/ci.yml/runs?per_page=100&branch=main&status=${status}`,
    )) as { workflow_runs: Run[] };
    if (!Array.isArray(result.workflow_runs))
      throw Error("Invalid deployment activity response");
    if (result.workflow_runs.length) return false;
  }
  return true;
}
export async function verifiedRelease(api: GitHub = github) {
  const result = (await api(
    `repos/${repository}/actions/artifacts?name=production-release&per_page=100`,
  )) as { artifacts: Artifact[] };
  if (!Array.isArray(result.artifacts))
    throw Error("Invalid release artifact response");
  // API returns newest first. Bounded history lookup; fail closed if no archive exists.
  for (const item of result.artifacts
    .filter(
      (a) =>
        a.name === "production-release" &&
        !a.expired &&
        a.workflow_run?.head_branch === "main",
    )
    .slice(0, 10)) {
    const run = (await api(
      `repos/${repository}/actions/runs/${item.workflow_run!.id}`,
    )) as Run;
    if (
      run.status === "completed" &&
      run.conclusion === "success" &&
      run.head_branch === "main" &&
      run.head_sha === item.workflow_run!.head_sha &&
      /^[a-f0-9]{40}$/.test(run.head_sha)
    )
      return { run_id: run.id, artifact_id: item.id, commit: run.head_sha };
  }
  throw Error(
    "NOT VERIFIED: no retained production-release archive from a successful main deployment",
  );
}
export async function monitor(
  root: string,
  expectedCommit: string,
  env: NodeJS.ProcessEnv,
  api: GitHub = github,
  network: Network = fetch,
) {
  if (!(await deploymentIdle(api)))
    return {
      state: "deferred",
      reason: "production deployment active; no live probes performed",
    };
  const config = settings({
    ...env,
    GEMMA_FREE_CONFIRMED: "false",
    LLAMA_FREE_CONFIRMED: "false",
  });
  const receipt = JSON.parse(
    await readFile(`${root}/.wrangler/deployment-receipt.local.json`, "utf8"),
  ) as {
    commit: string;
    versions: Record<string, string>;
    verified_at: string;
  };
  if (
    !/^[a-f0-9]{40}$/.test(expectedCommit) ||
    receipt.commit !== expectedCommit ||
    !Number.isFinite(Date.parse(receipt.verified_at))
  )
    throw Error(
      "Missing/mismatched verified deployment receipt; main HEAD is not assumed deployed",
    );
  let failure: unknown;
  try {
    const versions = await verifyVersions(config, expectedCommit, network);
    if (
      Object.entries(versions).some(
        ([name, version]) => receipt.versions?.[name] !== version,
      )
    )
      throw Error(
        "Active Worker versions differ from the archived verified receipt",
      );
    await verifySupabase(config, network);
    await verifySites(config, network, root);
    const again = await verifyVersions(config, expectedCommit, network);
    if (
      Object.entries(again).some(
        ([name, version]) => receipt.versions[name] !== version,
      )
    )
      throw Error(
        "Worker versions changed during monitoring; no stable release verification",
      );
  } catch (error) {
    failure = error;
  }
  // A deployment may have started between the initial idle read and a probe.
  if (!(await deploymentIdle(api)))
    return {
      state: "deferred",
      reason: "deployment started during checks; no health conclusion",
    };
  if (failure) throw failure;
  return {
    state: "verified",
    commit: expectedCommit,
    checked_at: new Date().toISOString(),
    scope:
      "archived static hashes/SPA/headers, active Worker tags, public backend and anonymous authorization/CORS negatives; not real user/OAuth/SMTP/AI or full DB audit",
  };
}
async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "check")
    await rm(".wrangler/maintenance.local.json", { force: true });
  for (const file of [".env", ".deploy.env"])
    if (existsSync(file)) process.loadEnvFile(file);
  if (mode === "push-check" && args.length === 0) {
    if (!(await deploymentIdle()))
      throw Error(
        "Publishing blocked: production run is active/queued/waiting. Keep local work; never cancel it.",
      );
    console.log(
      "PASS GitHub production workflow idle at observation time. Recheck immediately before push; native Cloudflare jobs require separate visibility.",
    );
  } else if (mode === "select" && args.length === 0) {
    if (!(await deploymentIdle())) {
      if (process.env.GITHUB_OUTPUT)
        await appendFile(process.env.GITHUB_OUTPUT, "deferred=true\n");
      console.log(
        "DEFERRED: active production deployment; no service checks or changes.",
      );
      return;
    }
    const release = await verifiedRelease();
    if (process.env.GITHUB_OUTPUT)
      await appendFile(
        process.env.GITHUB_OUTPUT,
        Object.entries(release)
          .map(([k, v]) => `${k}=${v}\n`)
          .join(""),
      );
    console.log(JSON.stringify(release));
  } else if (
    mode === "check" &&
    args.length === 4 &&
    args[0] === "--artifact-root" &&
    args[2] === "--expected-commit"
  ) {
    const result = await monitor(resolve(args[1]), args[3], process.env);
    if (process.env.GITHUB_OUTPUT)
      await appendFile(
        process.env.GITHUB_OUTPUT,
        `deferred=${result.state === "deferred"}\n`,
      );
    await mkdir(".wrangler", { recursive: true });
    await writeFile(".wrangler/maintenance.local.json", JSON.stringify(result));
    const report = JSON.stringify(result, null, 2);
    console.log(report);
    if (process.env.GITHUB_STEP_SUMMARY)
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        `### EngJatra maintenance\n\n\`\`\`json\n${report}\n\`\`\`\n`,
      );
  } else
    throw Error(
      "Use push-check, select, or check --artifact-root <verified archive> --expected-commit <archived SHA>",
    );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await main();
  } catch (error) {
    const message = redactLog((error as Error).message, process.env);
    console.error(message);
    if (process.env.GITHUB_ACTIONS === "true")
      console.error(
        `::error title=EngJatra maintenance blocked::${message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}`,
      );
    process.exitCode = 1;
  }
}
