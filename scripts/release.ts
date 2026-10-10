import { readFile, writeFile, mkdir, cp, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Manifest, Unit } from "../packages/contracts/content";
import { sha, scan } from "./content-tools";
const [input, version, output, baseline] = process.argv.slice(2);
if (!input || !/^\d+\.\d+\.\d+$/.test(version ?? "") || !output)
  throw Error(
    "Usage: npm run release:export -- changes.local.json <new-version> /tmp/engjatra-release (version must be absent from the baseline)",
  );
if (
  resolve(output).startsWith(resolve("content")) ||
  resolve(output).startsWith(resolve("apps"))
)
  throw Error("Use a separate release artifact directory");
const source = "apps/student-web/dist";
const base = baseline ?? source;
async function auditTree(dir: string): Promise<void> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) await auditTree(p);
    else if (e.name.endsWith(".json"))
      scan(JSON.parse(await readFile(p, "utf8")));
  }
}
await auditTree(`${base}/content`);
const manifest = Manifest.parse(
  JSON.parse(await readFile(`${base}/content/manifest.json`, "utf8")),
);
if (
  version === manifest.version ||
  (await readdir(`${base}/content`)).includes(version)
)
  throw Error("New immutable version required");
const changes = JSON.parse(await readFile(input, "utf8")) as {
  patches: { unit_id: string; base_release: string; unit: unknown }[];
};
if (!Array.isArray(changes.patches)) throw Error("Invalid export");
await mkdir(output, { recursive: false });
await cp(source, output, { recursive: true });
// Retain every previously published immutable release alongside the fresh application build.
await cp(`${base}/content`, `${output}/content`, { recursive: true });
await cp(
  `${base}/content/${manifest.version}`,
  `${output}/content/${version}`,
  { recursive: true },
);
for (const patch of changes.patches) {
  if (patch.base_release !== manifest.version)
    throw Error("Stale baseline: refresh draft before publishing");
  scan(patch.unit);
  const unit = Unit.parse(patch.unit);
  if (unit.id !== patch.unit_id) throw Error("ID changed");
  const body = JSON.stringify(unit);
  await writeFile(
    `${output}/content/${version}/${unit.level}/${unit.id}.json`,
    body,
  );
  const entry = manifest.levels
    .flatMap((l) => l.units)
    .find((u) => u.id === unit.id);
  if (!entry) throw Error("Unknown unit");
  entry.title_bn = unit.title_bn;
  entry.goal_bn = unit.goal_bn;
  entry.sha256 = sha(body);
}
manifest.version = version;
const body = JSON.stringify(manifest);
await writeFile(`${output}/content/manifest.json`, body);

const headers = (await readFile(`${output}/_headers`, "utf8")).replace(
  /\n\/content\/\d+\.\d+\.\d+\/\*\n {2}Cache-Control: public, max-age=31536000, immutable\n?/g,
  "\n",
);
const versions = (await readdir(`${output}/content`)).filter((v) =>
  /^\d+\.\d+\.\d+$/.test(v),
);
await writeFile(
  `${output}/_headers`,
  headers +
    versions
      .map(
        (v) =>
          `\n/content/${v}/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
      )
      .join(""),
);

console.log(
  JSON.stringify({
    artifact: resolve(output),
    version,
    manifest_sha256: sha(body),
    state: "awaiting_deploy",
  }),
);
