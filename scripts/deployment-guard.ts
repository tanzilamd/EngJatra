import type { DeploymentConfig } from "./deployment-config";
import { cloudRequest, type Network } from "./deployment-verify";
import { trustedAncestor } from "./recover-publication";
import { github, type GitHub } from "./maintenance";

export type ActiveVersion = { id: string; commit: string };
export async function deploymentSnapshot(
  config: DeploymentConfig,
  expected: string,
  network: Network = fetch,
  api: GitHub = github,
) {
  const workers = (await cloudRequest(config, "/workers/scripts", network)) as {
    id: string;
  }[];
  if (!Array.isArray(workers))
    throw Error("Invalid Worker inventory; publishing blocked");
  const result: Record<string, ActiveVersion | null> = {};
  for (const name of ["engjatra-api", "engjatra", "engjatra-admin"]) {
    if (!workers.some((w) => w.id === name)) {
      result[name] = null;
      continue;
    }
    const data = (await cloudRequest(
      config,
      `/workers/scripts/${name}/deployments`,
      network,
    )) as {
      deployments?: {
        versions?: { version_id: string; percentage: number }[];
      }[];
    };
    const versions = data?.deployments?.[0]?.versions;
    if (versions?.length !== 1 || versions[0].percentage !== 100)
      throw Error("Ambiguous existing deployment; no overwrite permitted");
    const version = (await cloudRequest(
      config,
      `/workers/scripts/${name}/versions/${versions[0].version_id}`,
      network,
    )) as { annotations?: Record<string, string> };
    const tag = version?.annotations?.["workers/tag"];
    if (!tag)
      throw Error(
        "Existing Worker has no source tag; adoption requires review",
      );
    await trustedAncestor(tag, expected, api);
    result[name] = { id: versions[0].version_id, commit: tag };
  }
  return result;
}
export function unchangedTarget(
  before: ActiveVersion | null,
  after: ActiveVersion | null,
) {
  if (before?.id !== after?.id || before?.commit !== after?.commit)
    throw Error(
      "Active production changed during validation; no upload permitted",
    );
}
