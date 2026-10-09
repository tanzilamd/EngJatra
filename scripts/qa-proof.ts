import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
export const proofPath = ".wrangler/qa.local.json";
const startPath = ".wrangler/qa.started.local.json";
export function commit(root = process.cwd()) {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    cwd: root,
  }).trim();
}
export async function fingerprint(root = process.cwd()) {
  const names = [
    ...new Set(
      execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
        encoding: "utf8",
        cwd: root,
      })
        .split("\0")
        .filter(Boolean),
    ),
  ].sort();
  const hash = createHash("sha256");
  for (const name of names) {
    hash.update(name);
    try {
      hash.update(await readFile(join(root, name)));
    } catch {
      hash.update("deleted");
    }
  }
  return hash.digest("hex");
}
export async function proofCurrent(root = process.cwd()) {
  try {
    const proof = JSON.parse(await readFile(join(root, proofPath), "utf8"));
    return (
      proof.commit === commit(root) &&
      proof.source === (await fingerprint(root))
    );
  } catch {
    return false;
  }
}
export async function recordStart(root = process.cwd()) {
  await mkdir(join(root, ".wrangler"), { recursive: true });
  await writeFile(
    join(root, startPath),
    JSON.stringify({ commit: commit(root), source: await fingerprint(root) }),
  );
}
export async function recordProof(root = process.cwd()) {
  const start = JSON.parse(await readFile(join(root, startPath), "utf8"));
  if (
    start.commit !== commit(root) ||
    start.source !== (await fingerprint(root))
  )
    throw Error(
      "Source/commit changed during QA; rerun before using deployment evidence",
    );
  await writeFile(
    join(root, proofPath),
    JSON.stringify({ ...start, checked_at: new Date().toISOString() }),
  );
  console.log(
    "Recorded local QA evidence for this commit and unchanged tested source tree; not production verification.",
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv[2] === "begin") await recordStart();
  else if (process.argv[2] === "finish") await recordProof();
  else
    throw Error(
      "QA evidence requires begin/finish around the complete QA sequence",
    );
}
