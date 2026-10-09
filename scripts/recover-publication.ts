import { execFileSync } from "node:child_process";
import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  appendFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { settings, type DeploymentConfig } from "./deployment-config";
import {
  cloudRequest,
  verifyAccountOrigins,
  verifyVersions,
  verifySites,
  verifySupabase,
  type Network,
} from "./deployment-verify";
import { deploymentIdle, github, type GitHub } from "./maintenance";
import { preserveContent } from "./deployment-artifacts";
import { redactLog } from "./redact-log";

export async function trustedAncestor(
  base: string,
  head: string,
  api: GitHub = github,
) {
  if (!/^[a-f0-9]{40}$/.test(base) || !/^[a-f0-9]{40}$/.test(head))
    throw Error("Invalid source commit identity");
  const result = (await api(
    `repos/tanzilamd/EngJatra/compare/${base}...${head}`,
  )) as { status?: string };
  if (!["ahead", "identical"].includes(result?.status ?? ""))
    throw Error(
      "Deployed source is not an ancestor of trusted main; no untrusted checkout or overwrite permitted",
    );
}
export async function automaticRecoveryAllowed(
  runId: string,
  api: GitHub = github,
) {
  if (!/^\d+$/.test(runId)) throw Error("Invalid failed workflow identity");
  const run = (await api(`repos/tanzilamd/EngJatra/actions/runs/${runId}`)) as {
    head_sha: string;
    head_branch: string;
    conclusion: string;
  };
  if (run?.head_branch !== "main" || run?.conclusion !== "failure")
    return false;
  const result = (await api(
    `repos/tanzilamd/EngJatra/actions/runs/${runId}/jobs`,
  )) as {
    jobs?: {
      name: string;
      id: number;
      conclusion: string;
      steps: { name: string; conclusion: string }[];
    }[];
  };
  const qa = result.jobs?.find((j) => j.name === "qa");
  const deploy = result.jobs?.find((j) => j.name === "deploy");
  if (
    qa?.conclusion !== "success" ||
    deploy?.conclusion !== "failure" ||
    !deploy.steps?.some(
      (s) => s.name === "Run npm run deploy:all" && s.conclusion === "failure",
    )
  )
    return false;
  const annotations = (await api(
    `repos/tanzilamd/EngJatra/check-runs/${deploy.id}/annotations?per_page=100`,
  )) as { title: string; message: string }[];
  if (!Array.isArray(annotations))
    throw Error("Invalid recovery annotation evidence");
  const recoverable = annotations.some(
    (a) =>
      a.title === "EngJatra deployment blocked" &&
      /retained artifact is missing|Verification HTTP 404|deployment outcome remains uncertain/.test(
        a.message,
      ),
  );
  if (!recoverable) return false;
  const archive = (await api(
    "repos/tanzilamd/EngJatra/actions/artifacts?name=recovery-receipt&per_page=100",
  )) as {
    artifacts?: { expired: boolean; workflow_run?: { head_sha: string } }[];
  };
  if (!Array.isArray(archive.artifacts))
    throw Error("Invalid previous recovery evidence");
  // One automatic recovery per failed main commit: never loop unchanged CI failures.
  return !archive.artifacts.some(
    (a) => a.workflow_run?.head_sha === run.head_sha,
  );
}
export type Selection = {
  commit: string;
  versions: Record<string, string>;
};
export async function activeRelease(
  config: DeploymentConfig,
  network: Network = fetch,
): Promise<Selection> {
  await verifyAccountOrigins(config, network);
  const versions: Record<string, string> = {};
  const tags = new Set<string>();
  for (const name of ["engjatra", "engjatra-admin", "engjatra-api"]) {
    const data = (await cloudRequest(
      config,
      `/workers/scripts/${name}/deployments`,
      network,
    )) as {
      deployments?: {
        versions?: { version_id: string; percentage: number }[];
      }[];
    };
    const current = data?.deployments?.[0]?.versions;
    if (
      !current ||
      current.length !== 1 ||
      current[0].percentage !== 100 ||
      !current[0].version_id
    )
      throw Error(
        "Recovery requires one unambiguous active version per target; no rollout or upload attempted",
      );
    const version = (await cloudRequest(
      config,
      `/workers/scripts/${name}/versions/${current[0].version_id}`,
      network,
    )) as { annotations?: Record<string, string> };
    const tag = version?.annotations?.["workers/tag"];
    if (!tag || !/^[a-f0-9]{40}$/.test(tag))
      throw Error("Active release lacks a valid source commit tag");
    tags.add(tag);
    versions[name] = current[0].version_id;
  }
  if (tags.size !== 1)
    throw Error(
      "Active targets have different source commits; partial rollout must be reconciled before baseline recovery",
    );
  return { commit: [...tags][0], versions };
}
const hash = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");
export async function verifyPublicFiles(
  directory: string,
  base: string,
  network: Network = fetch,
) {
  const files: string[] = [];
  async function walk(root: string, prefix = "") {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const path = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await walk(join(root, entry.name), path);
      else if (entry.isFile()) {
        if (!["/_headers", "/_redirects"].includes(path)) files.push(path);
      } else
        throw Error(
          "Unexpected symlink/special file in recovered public artifact",
        );
    }
  }
  await walk(directory);
  if (!files.includes("/index.html"))
    throw Error("Recovered artifact has no homepage");
  for (let start = 0; start < files.length; start += 8)
    await Promise.all(
      files.slice(start, start + 8).map(async (path) => {
        const response = await network(
          `${base}${path === "/index.html" ? "/" : path}`,
          {
            redirect: "error",
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!response.ok)
          throw Error(
            `Recovery public file HTTP ${response.status}: ${base}${path}`,
          );
        if (
          hash(new Uint8Array(await response.arrayBuffer())) !==
          hash(await readFile(`${directory}${path}`))
        )
          throw Error(
            `Recovery file differs from the actual deployed source artifact: ${path}`,
          );
      }),
    );
  return files.length;
}
export async function auditPublication(
  config: DeploymentConfig,
  selection: Selection,
  sourceRoot: string,
  network: Network = fetch,
  api: GitHub = github,
) {
  if (!(await deploymentIdle(api)))
    throw Error("Recovery deferred: production active; no baseline certified");
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: sourceRoot,
    encoding: "utf8",
  }).trim();
  if (head !== selection.commit)
    throw Error("Candidate source checkout is not the exact deployed commit");
  const current = await verifyVersions(config, selection.commit, network);
  if (
    Object.entries(current).some(
      ([name, id]) => selection.versions[name] !== id,
    )
  )
    throw Error("Active versions changed before recovery; nothing promoted");
  await verifySupabase(config, network);
  await verifySites(config, network, sourceRoot);
  const studentFiles = await verifyPublicFiles(
    `${sourceRoot}/apps/student-web/dist`,
    config.student,
    network,
  );
  const adminFiles = await verifyPublicFiles(
    `${sourceRoot}/apps/admin-web/dist`,
    config.admin,
    network,
  );
  const again = await verifyVersions(config, selection.commit, network);
  if (
    Object.entries(again).some(
      ([name, id]) => selection.versions[name] !== id,
    ) ||
    !(await deploymentIdle(api))
  )
    throw Error(
      "Production changed during recovery; no stable baseline certified",
    );
  return {
    ...selection,
    verified_at: new Date().toISOString(),
    student_files: studentFiles,
    admin_files: adminFiles,
    scope:
      "actual source checkout, every public artifact hash, active versions, SPA/headers/CORS and anonymous authorization; not real email/OAuth/login or complete DB history",
  };
}
async function output(values: Record<string, string>) {
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      Object.entries(values)
        .map(([name, value]) => `${name}=${value}\n`)
        .join(""),
    );
}
async function main() {
  const [mode, ...args] = process.argv.slice(2);
  const config = settings({
    ...process.env,
    GEMMA_FREE_CONFIRMED: "false",
    LLAMA_FREE_CONFIRMED: "false",
  });
  if (mode === "select" && args.length === 0) {
    if (!(await deploymentIdle())) {
      await output({ deferred: "true" });
      console.log(
        "DEFERRED: production is active; recovery does not cancel or compete with it",
      );
      return;
    }
    if (
      process.env.FAILED_RUN_ID &&
      !(await automaticRecoveryAllowed(process.env.FAILED_RUN_ID))
    ) {
      await output({ deferred: "true" });
      console.log(
        "NOT RETRIED: failure is not an eligible partial-publication/baseline case or automatic recovery already ran for this commit",
      );
      return;
    }
    const selected = await activeRelease(config);
    const trusted = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    await trustedAncestor(selected.commit, trusted);
    await mkdir(".wrangler", { recursive: true });
    await writeFile(
      ".wrangler/recovery-selection.local.json",
      JSON.stringify(selected),
      { mode: 0o600 },
    );
    await output({ commit: selected.commit });
    console.log(
      JSON.stringify({
        selected_commit: selected.commit,
        scope: "version selection only; live verification pending",
      }),
    );
  } else if (
    mode === "audit" &&
    args.length === 2 &&
    args[0] === "--source-root"
  ) {
    const source = resolve(args[1]);
    const selected = JSON.parse(
      await readFile(".wrangler/recovery-selection.local.json", "utf8"),
    ) as Selection;
    if (!/^[a-f0-9]{40}$/.test(selected.commit))
      throw Error("Invalid recovery selection");
    const retained = ".wrangler/recovery-retained";
    try {
      await readFile(`${retained}/content/manifest.json`);
      await preserveContent(retained, `${source}/apps/student-web/dist`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const receipt = await auditPublication(config, selected, source);
    await writeFile(
      ".wrangler/recovery-receipt.local.json",
      JSON.stringify(receipt, null, 2),
      { mode: 0o600 },
    );
    await output({ verified: "true" });
    console.log(JSON.stringify(receipt));
  } else
    throw Error(
      "Use select or audit --source-root <exact published source checkout>. Recovery never publishes or applies SQL.",
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
        `::error title=EngJatra recovery blocked::${message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}`,
      );
    process.exitCode = 1;
  }
}
