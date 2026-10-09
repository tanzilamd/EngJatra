import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  targets,
  settings,
  inspectTargets,
  apiConfiguration,
  apiSecrets,
  type DeploymentConfig,
} from "./deployment-config";
import {
  verifySites,
  verifySupabase,
  verifyVersions,
  cloudRequest,
  verifyAccountOrigins,
} from "./deployment-verify";
import { preserveContent } from "./deployment-artifacts";
import { proofCurrent, commit } from "./qa-proof";
import { publishWithRecovery } from "./deployment-recovery";
import { redactLog } from "./redact-log";
import { deploymentSnapshot, unchangedTarget } from "./deployment-guard";
for (const file of [".env", ".deploy.env"])
  if (existsSync(file)) process.loadEnvFile(file);
const [mode = "check", ...args] = process.argv.slice(2);
function run(command: string, args: string[], env = process.env) {
  return new Promise<void>((done, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? done()
        : reject(Error(`${command} failed (${code}); no success is claimed`)),
    );
  });
}
const npm = (args: string[], env?: NodeJS.ProcessEnv) =>
  run(process.platform === "win32" ? "npm.cmd" : "npm", args, env);
const wrangler = (args: string[]) =>
  run(process.execPath, ["--import", "tsx", "scripts/wrangler.ts", ...args]);
async function artifacts() {
  for (const path of [
    "apps/student-web/dist/index.html",
    "apps/admin-web/dist/index.html",
    "apps/student-web/dist/content/manifest.json",
  ])
    await readFile(path);
  const { scan } = await import("./content-tools");
  async function walk(path: string) {
    for (const e of await readdir(path, { withFileTypes: true })) {
      const file = `${path}/${e.name}`;
      if (e.isDirectory()) await walk(file);
      else if (e.name.endsWith(".json"))
        scan(JSON.parse(await readFile(file, "utf8")));
    }
  }
  await walk("apps/student-web/dist/content");
  await run(process.execPath, ["--import", "tsx", "scripts/scan-build.ts"]);
}
async function stage(config: DeploymentConfig) {
  const dir = ".wrangler/deploy.local";
  await mkdir(dir, { recursive: true });
  const api = resolve(`${dir}/api.json`),
    secrets = resolve(`${dir}/secrets.json`);
  await writeFile(api, JSON.stringify(apiConfiguration(config)), {
    mode: 0o600,
  });
  await writeFile(secrets, JSON.stringify(apiSecrets(config)), { mode: 0o600 });
  return { api, secrets };
}
async function compile(config?: DeploymentConfig) {
  const staged = config ? await stage(config) : undefined;
  try {
    for (const target of targets)
      await wrangler([
        "deploy",
        "--config",
        target.service === "api" && staged ? staged.api : target.config,
        "--autoconfig=false",
        "--dry-run",
        "--outdir",
        `.wrangler/dry-${target.service}`,
        ...(target.service === "api" && staged
          ? ["--secrets-file", staged.secrets]
          : []),
      ]);
  } finally {
    if (staged) await rm(staged.secrets, { force: true });
  }
}
async function main() {
  const flags = new Set(
    mode === "check"
      ? ["--offline", "--dry-run", "--configuration-only", "--live"]
      : mode === "all"
        ? ["--dry-run", "--baseline"]
        : [],
  );
  if (args.includes("--offline") && args.length !== 1)
    throw Error("--offline cannot be combined with external readiness flags");
  for (let i = 0; i < args.length; i++) {
    if (!flags.has(args[i]))
      throw Error("Unknown deployment argument; publishing is blocked");
    if (args[i] === "--baseline") {
      if (!args[++i] || args[i].startsWith("--"))
        throw Error("--baseline requires an artifact directory");
    }
  }
  await inspectTargets();
  if (args.includes("--offline")) {
    if (mode !== "check")
      throw Error("--offline is only a local check, never a deployment");
    await artifacts();
    await compile();
    console.log(
      "PASS local target/assets/SPA/Worker compilation. External configuration and deployment readiness are NOT verified.",
    );
    return;
  }
  const config = settings(process.env, !args.includes("--dry-run"));
  if (mode === "check") {
    if (!args.includes("--configuration-only")) {
      await artifacts();
      await compile(config);
    }
    if (args.includes("--live")) {
      await verifyAccountOrigins(config);
      await verifySupabase(config);
    }
    console.log(
      "PASS configured local deployment checks. No services published; dashboard/auth/free eligibility and live production remain unverified.",
    );
    return;
  }
  if (mode === "verify" || mode === "recover") {
    await verifyAccountOrigins(config);
    if (mode === "recover") {
      console.log(
        "Read-only recovery: no upload, secret mutation, rollback or SQL execution",
      );
      await artifacts();
    }
    await verifySupabase(config);
    const versions = await verifyVersions(config, commit());
    await verifySites(config);
    console.log(
      JSON.stringify({
        verified: true,
        commit: commit(),
        versions,
        scope:
          "artifacts, anonymous security and transport; real login/OAuth/AI still require E2E",
      }),
    );
    return;
  }
  if (mode !== "all") throw Error("Use check, all, verify, or recover");
  const branch = execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
  }).trim();
  const trustedMainCI =
    process.env.GITHUB_ACTIONS === "true" &&
    process.env.GITHUB_REF === "refs/heads/main" &&
    process.env.GITHUB_SHA === commit();
  if (!args.includes("--dry-run") && branch !== "main" && !trustedMainCI)
    throw Error("Production publishing is restricted to main");
  if (!args.includes("--dry-run")) await verifyAccountOrigins(config);
  if (!(await proofCurrent()))
    await npm(["run", "qa"], {
      ...process.env,
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
      VITE_API_URL: "",
    });
  if (!(await proofCurrent()))
    throw Error("QA evidence missing or stale for current commit/source tree");
  await npm(["run", "build"]);
  const baseline = args.includes("--baseline")
    ? args[args.indexOf("--baseline") + 1]
    : ".wrangler/deployed-sites";
  if (!baseline)
    throw Error(
      "--baseline requires the archived previously deployed student artifact",
    );
  if (existsSync(`${baseline}/content/manifest.json`))
    await preserveContent(baseline);
  await artifacts();
  await compile(config);
  if (args.includes("--dry-run")) {
    console.log("PASS configured build and three dry runs; nothing deployed.");
    return;
  }
  await verifySupabase(config);
  // Read-only API permission check before the first mutation.
  await cloudRequest(config, "/workers/scripts");
  // Avoid erasing a later editorial release if its retained baseline is unavailable.
  try {
    const response = await fetch(`${config.student}/content/manifest.json`, {
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (response.ok) {
      if (!existsSync(`${baseline}/content/manifest.json`))
        throw Error(
          "Published content exists but its retained artifact is missing; restore the approved baseline before deployment",
        );
      const expected = await readFile(
        "apps/student-web/dist/content/manifest.json",
        "utf8",
      );
      const actual = await response.text();

      if (
        actual !== expected &&
        (!existsSync(`${baseline}/content/manifest.json`) ||
          actual !==
            (await readFile(`${baseline}/content/manifest.json`, "utf8")))
      )
        throw Error(
          "Current published content version differs: restore the verified prior artifact before deployment",
        );
    } else if (response.status !== 404)
      throw Error("Current student content baseline cannot be verified");
  } catch (error) {
    // DNS failure for a genuinely new Worker is allowed only after API proves it absent.
    const workers = (await cloudRequest(config, "/workers/scripts")) as {
      id: string;
    }[];
    if (workers.some((worker) => worker.id === "engjatra")) throw error;
  }
  if (!(await proofCurrent()))
    throw Error("Source changed after QA; publishing is blocked");
  const version = commit();
  const before = await deploymentSnapshot(config, version);
  if (Object.values(before).every((active) => active?.commit === version)) {
    // Read-only reconciliation of a previously accepted current release.
    // A mismatch fails closed; never upload again merely because a probe failed.
    await verifySites(config);
    const versions = await verifyVersions(config, version);
    await writeFile(
      ".wrangler/deployment-receipt.local.json",
      JSON.stringify({
        commit: version,
        versions,
        verified_at: new Date().toISOString(),
        scope:
          "accepted current release reconciled without uploads; artifacts/CORS/anonymous negatives",
      }),
    );
    console.log(
      "PASS existing current release verified; no duplicate uploads performed.",
    );
    return;
  }
  const assertUnchanged = async (name: string) => {
    const current = await deploymentSnapshot(config, version);
    unchangedTarget(before[name], current[name]);
  };
  const staged = await stage(config);
  try {
    await assertUnchanged("engjatra-api");
    await publishWithRecovery(config, "engjatra-api", version, () =>
      wrangler([
        "deploy",
        "--config",
        staged.api,
        "--autoconfig=false",
        "--keep-vars",
        "--strict",
        "--tag",
        version,
        "--secrets-file",
        staged.secrets,
      ]),
    );
    for (const target of targets.filter((target) => target.service !== "api")) {
      await assertUnchanged(target.name);
      await publishWithRecovery(config, target.name, version, () =>
        wrangler([
          "deploy",
          "--config",
          target.config,
          "--autoconfig=false",
          "--strict",
          "--tag",
          version,
        ]),
      );
    }
    const versions = await verifyVersions(config, version);
    await writeFile(
      ".wrangler/publication-attempt.local.json",
      JSON.stringify({
        commit: version,
        versions,
        origins: {
          student: config.student,
          admin: config.admin,
          api: config.api,
        },
        recorded_at: new Date().toISOString(),
        state: "published_versions_only",
        scope:
          "attempted build/version evidence; site/security verification incomplete; never a success receipt",
      }),
      { mode: 0o600 },
    );
    await verifySites(config);
    await writeFile(
      ".wrangler/deployment-receipt.local.json",
      JSON.stringify({
        commit: version,
        versions,
        verified_at: new Date().toISOString(),
        scope: "static artifacts, CORS and anonymous negative checks",
      }),
    );
    console.log(
      "PASS deployed active versions and live artifacts/security verified. Real user/OAuth/AI behavior is a separate test gate.",
    );
  } catch (error) {
    console.error(
      "Deployment or verification failed. Some targets may have updated; inspect Cloudflare versions/logs and use the documented rollback. No full deployment success is claimed.",
    );
    throw error;
  } finally {
    await rm(staged.secrets, { force: true });
  }
}
try {
  await main();
} catch (error) {
  const message = redactLog((error as Error).message, process.env);
  console.error(message);
  if (process.env.GITHUB_ACTIONS === "true")
    console.error(
      `::error title=EngJatra deployment blocked::${message
        .replaceAll("%", "%25")
        .replaceAll("\r", "%0D")
        .replaceAll("\n", "%0A")}`,
    );
  process.exitCode = 1;
}
