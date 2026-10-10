import { readFile, readdir, writeFile } from "node:fs/promises";
import { Manifest, Unit } from "../packages/contracts/content";
import { scan, sha } from "./content-tools";
import {
  ContentRelease,
  compareVersion,
  validateUnitPatch,
} from "./content-releases";

const [input, version, output, baseline = "apps/student-web/dist"] =
  process.argv.slice(2);
if (
  process.argv.length > 6 ||
  !input ||
  !output ||
  !/^\d+\.\d+\.\d+$/.test(version ?? "")
)
  throw Error(
    "Usage: npm run release:prepare -- changes.local.json <new-version> <public-release.json> [verified-site-baseline]",
  );
const manifest = Manifest.parse(
  JSON.parse(await readFile(`${baseline}/content/manifest.json`, "utf8")),
);
if (
  compareVersion(version, manifest.version) <= 0 ||
  (await readdir(`${baseline}/content`)).includes(version)
)
  throw Error("New increasing immutable version required");
const changes = JSON.parse(await readFile(input, "utf8")) as {
  patches: { unit_id: string; base_release: string; unit: unknown }[];
};
scan(changes);
if (!Array.isArray(changes.patches) || !changes.patches.length)
  throw Error("No reviewed unit patches supplied");
const patches = [];
for (const patch of changes.patches) {
  if (patch.base_release !== manifest.version)
    throw Error("Stale baseline: refresh the reviewed draft");
  const unit = Unit.parse(patch.unit);
  if (unit.id !== patch.unit_id) throw Error("Unit identity changed");
  const original = await readFile(
    `${baseline}/content/${manifest.version}/${unit.level}/${unit.id}.json`,
    "utf8",
  );
  const item = {
    kind: "unit" as const,
    id: unit.id,
    level: unit.level,
    expected_sha256: sha(original),
    value: unit,
  };
  validateUnitPatch(original, item);
  patches.push(item);
}
if (new Set(patches.map((p) => p.id)).size !== patches.length)
  throw Error("Duplicate unit patches");
const release = ContentRelease.parse({
  base_release: manifest.version,
  version,
  patches,
});
await writeFile(output, JSON.stringify(release, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify({
    output,
    version,
    units: patches.length,
    state: "prepared_only",
    published: false,
  }),
);
