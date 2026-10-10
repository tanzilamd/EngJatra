import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import {
  Level,
  Library,
  Manifest,
  type LibraryData,
} from "../packages/contracts/content";
import { scan } from "./content-tools";

const version = z.string().regex(/^\d+\.\d+\.\d+$/);
const text = z.string().trim().min(1).max(1200);
const Patch = z.discriminatedUnion("kind", [
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
export const LibraryRelease = z
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
  const release = LibraryRelease.parse(raw);
  const library = structuredClone(source);
  const seen = new Set<string>();
  for (const patch of release.patches.filter((p) => p.level === level)) {
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
    } else {
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

const compareVersion = (a: string, b: string) => {
  const left = a.split(".").map(Number),
    right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++)
    if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
};

// Source releases are append-only. Never edit an already published file or its base library.
export async function exportLibraryReleases(root: string): Promise<string[]> {
  const manifest = Manifest.parse(
    JSON.parse(await readFile(`${root}/content/manifest.json`, "utf8")),
  );
  const files = (await readdir("content/releases"))
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => compareVersion(a.slice(0, -5), b.slice(0, -5)));
  const versions: string[] = [];
  for (const file of files) {
    const raw = JSON.parse(await readFile(`content/releases/${file}`, "utf8"));
    scan(raw);
    const release = LibraryRelease.parse(raw);
    if (
      file !== `${release.version}.json` ||
      release.base_release !== manifest.version ||
      compareVersion(release.version, release.base_release) <= 0
    )
      throw Error(
        "Library release requires a fresh, increasing, matching baseline",
      );
    const destination = `${root}/content/${release.version}`;
    // Content export regenerates only checked-in releases. A current version can be
    // regenerated locally; the deployment guard still compares all retained live bytes.
    await mkdir(destination, { recursive: true });
    await cp(`${root}/content/${release.base_release}`, destination, {
      recursive: true,
    });
    let applied = 0;
    for (const band of manifest.levels) {
      const path = `${destination}/${band.id}/library.json`;
      const library = Library.parse(JSON.parse(await readFile(path, "utf8")));
      await writeFile(
        path,
        JSON.stringify(applyLibrarySupplements(library, release, band.id)),
      );
      applied += release.patches.filter((p) => p.level === band.id).length;
    }
    if (applied !== release.patches.length)
      throw Error("Unapplied library supplement");
    manifest.version = release.version;
    versions.push(release.version);
  }
  await writeFile(`${root}/content/manifest.json`, JSON.stringify(manifest));
  return versions;
}
