import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import {
  Level,
  Library,
  Manifest,
  Unit,
  unitId,
  type LibraryData,
} from "../packages/contracts/content";
import { scan, sha } from "./content-tools";

const version = z.string().regex(/^\d+\.\d+\.\d+$/);
const text = z.string().trim().min(1).max(1200);
const UnitPatch = z
  .object({
    kind: z.literal("unit"),
    level: Level,
    id: unitId,
    expected_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    value: Unit,
  })
  .strict();
const Patch = z.discriminatedUnion("kind", [
  UnitPatch,
  z
    .object({
      kind: z.literal("grammar_translation"),
      level: Level,
      id: text,
      expected: text,
      value: text,
    })
    .strict(),
  z
    .object({
      kind: z.literal("grammar_caveat"),
      level: Level,
      id: text,
      expected: text,
      value: text,
    })
    .strict(),
  z
    .object({
      kind: z.literal("vocabulary_example"),
      level: Level,
      id: text,
      expected: text,
      expected_bn: text,
      value: text,
    })
    .strict(),
]);
export const ContentRelease = z
  .object({
    base_release: version,
    version,
    patches: z.array(Patch).min(1).max(100),
  })
  .strict();

export function applyLibrarySupplements(
  source: LibraryData,
  raw: unknown,
  level: z.infer<typeof Level>,
): LibraryData {
  scan(raw);
  const release = ContentRelease.parse(raw);
  const library = structuredClone(source);
  const seen = new Set<string>();
  for (const patch of release.patches.filter(
    (p) => p.level === level && p.kind !== "unit",
  )) {
    const key = `${patch.kind}:${patch.id}`;
    if (seen.has(key)) throw Error("Duplicate library supplement");
    seen.add(key);
    if (patch.kind === "vocabulary_example") {
      const item = library.vocabulary.find((v) => v.id === patch.id);
      if (
        !item ||
        item.learning_level_suggested !== level ||
        item.en !== patch.expected ||
        item.bn !== patch.expected_bn
      )
        throw Error("Unknown or changed vocabulary sense");
      if (item.english_example)
        throw Error("Supplement would replace an existing vocabulary example");
      if (
        !/^[\x20-\x7e]+$/.test(patch.value) ||
        !patch.value.toLowerCase().includes(item.en.toLowerCase())
      )
        throw Error("Vocabulary example must use its English word");
      item.english_example = patch.value;
    } else if (patch.kind !== "unit") {
      const item = library.grammar.find((g) => g.id === patch.id);
      if (!item || item.level !== level) throw Error("Unknown grammar card");
      if (patch.kind === "grammar_translation") {
        if (item.example_en !== patch.expected || item.example_bn)
          throw Error("Changed example or existing grammar translation");
        if (!/[\u0980-\u09ff]/.test(patch.value))
          throw Error("Translation needs Bengali text");
        item.example_bn = patch.value;
      } else {
        if (item.caveat_bn !== patch.expected)
          throw Error("Changed grammar caveat");
        item.caveat_bn = patch.value;
      }
    }
  }
  scan(library);
  return Library.parse(library);
}

export const compareVersion = (a: string, b: string) => {
  const left = a.split(".").map(Number),
    right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++)
    if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
};

export function validateUnitPatch(source: string, raw: unknown) {
  scan(raw);
  const patch = UnitPatch.parse(raw);
  const before = Unit.parse(JSON.parse(source));
  const unit = patch.value;
  if (sha(source) !== patch.expected_sha256) throw Error("Stale unit hash");
  if (
    before.id !== patch.id ||
    unit.id !== patch.id ||
    unit.level !== patch.level
  )
    throw Error("Unit identity changed");
  const previousActivities = before.exercises.map((a) => a.id).sort();
  const nextActivities = unit.exercises.map((a) => a.id).sort();
  if (JSON.stringify(previousActivities) !== JSON.stringify(nextActivities))
    throw Error("Activity identities must be retained");
  const savedKeys = unit.vocabulary.map((v) => v.id ?? `${unit.id}:${v.en}`);
  if (
    before.vocabulary.some(
      (v) => !savedKeys.includes(v.id ?? `${before.id}:${v.en}`),
    )
  )
    throw Error("Saved vocabulary identities must be retained");
  const body = JSON.stringify(unit);
  if (Buffer.byteLength(body) > 50000) throw Error("Oversized unit patch");
  return { unit, body };
}

// Used both by the canonical build and temporary artifact regression tests.
export async function applyContentRelease(root: string, raw: unknown) {
  scan(raw);
  const release = ContentRelease.parse(raw);
  const manifest = Manifest.parse(
    JSON.parse(await readFile(`${root}/content/manifest.json`, "utf8")),
  );
  if (
    release.base_release !== manifest.version ||
    compareVersion(release.version, manifest.version) <= 0
  )
    throw Error("Content release requires a fresh, increasing baseline");
  const seen = new Set<string>();
  const units = [];
  for (const patch of release.patches) {
    const key = `${patch.kind}:${patch.id}`;
    if (seen.has(key)) throw Error("Duplicate content patch");
    seen.add(key);
    if (patch.kind !== "unit") continue;
    const source = await readFile(
      `${root}/content/${manifest.version}/${patch.level}/${patch.id}.json`,
      "utf8",
    );
    const checked = validateUnitPatch(source, patch);
    const entry = manifest.levels
      .flatMap((l) => l.units)
      .find((u) => u.id === patch.id);
    if (!entry || entry.sha256 !== patch.expected_sha256)
      throw Error("Unknown or changed manifest unit");
    units.push(checked);
    entry.title_bn = checked.unit.title_bn;
    entry.goal_bn = checked.unit.goal_bn;
    entry.sha256 = sha(checked.body);
  }
  const destination = `${root}/content/${release.version}`;
  await mkdir(destination, { recursive: true });
  await cp(`${root}/content/${manifest.version}`, destination, {
    recursive: true,
  });
  for (const band of manifest.levels) {
    const path = `${destination}/${band.id}/library.json`;
    const library = Library.parse(JSON.parse(await readFile(path, "utf8")));
    await writeFile(
      path,
      JSON.stringify(applyLibrarySupplements(library, release, band.id)),
    );
  }
  for (const { unit, body } of units)
    await writeFile(`${destination}/${unit.level}/${unit.id}.json`, body);
  manifest.version = release.version;
  await writeFile(`${root}/content/manifest.json`, JSON.stringify(manifest));
  return manifest;
}

// Source releases are append-only. Never edit an already published file or its base library.
export async function exportContentReleases(root: string): Promise<string[]> {
  let manifest = Manifest.parse(
    JSON.parse(await readFile(`${root}/content/manifest.json`, "utf8")),
  );
  const files = (await readdir("content/releases"))
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => compareVersion(a.slice(0, -5), b.slice(0, -5)));
  const versions: string[] = [];
  for (const file of files) {
    const raw = JSON.parse(await readFile(`content/releases/${file}`, "utf8"));
    scan(raw);
    const release = ContentRelease.parse(raw);
    if (
      file !== `${release.version}.json` ||
      release.base_release !== manifest.version ||
      compareVersion(release.version, release.base_release) <= 0
    )
      throw Error(
        "Library release requires a fresh, increasing, matching baseline",
      );
    manifest = await applyContentRelease(root, release);
    versions.push(release.version);
  }
  await writeFile(`${root}/content/manifest.json`, JSON.stringify(manifest));
  return versions;
}
