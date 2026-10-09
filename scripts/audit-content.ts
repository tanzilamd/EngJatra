import { readJson, normalizeUnit, scan } from "./content-tools";
import { bands, score } from "../packages/learning/engine";
import { Library, Manifest } from "../packages/contracts/content";
import { readFile } from "node:fs/promises";
const manifest = Manifest.parse(
  await readJson("apps/student-web/public/content/manifest.json"),
);
const counts = {
  units: 0,
  grammar: 0,
  vocabulary: 0,
  conversations: 0,
  readings: 0,
};
for (const band of bands) {
  const library = Library.parse(
    await readJson(
      `apps/student-web/public/content/${manifest.version}/${band}/library.json`,
    ),
  );
  scan(library);
  counts.grammar += library.grammar.length;
  counts.vocabulary += library.vocabulary.length;
  counts.conversations += library.conversations.length;
  counts.readings += library.readings.length;
  for (let i = 1; i <= 16; i++) {
    const id = `${band}-${String(i).padStart(2, "0")}`;
    const unit = normalizeUnit(
      await readJson(`content/units-public/${band}/${id}.json`),
    );
    counts.units++;
    scan(unit);
    if (new Set(unit.exercises.map((a) => a.id)).size !== unit.exercises.length)
      throw Error(`Duplicate IDs ${id}`);
    for (const a of unit.exercises) {
      const correct = a.options
        ? a.correct_index!
        : a.type === "word_order"
          ? a.answer!
          : Object.fromEntries(a.pairs?.map((p) => [p.en, p.bn]) ?? []);
      if (a.auto_graded && score(a, correct) !== true)
        throw Error(`Unscorable key ${a.id}`);
      if (!a.auto_graded && score(a, "anything") !== null)
        throw Error("Writing incorrectly scored");
      if (
        a.type === "word_order" &&
        a.tokens?.slice().sort().join(" ") !==
          a.answer?.split(" ").sort().join(" ")
      )
        throw Error(`Not a token permutation: ${a.id}`);
    }
    const size = Buffer.byteLength(
      await readFile(
        `apps/student-web/public/content/${manifest.version}/${band}/${id}.json`,
      ),
    );
    if (size > 50000) throw Error(`Oversized unit ${id}`);
  }
}
if (
  JSON.stringify(counts) !==
  JSON.stringify({
    units: 96,
    grammar: 132,
    vocabulary: 932,
    conversations: 96,
    readings: 12,
  })
)
  throw Error(JSON.stringify(counts));
console.log(
  "PASS schema, all authored keys, token permutations, metadata, lazy payload size, library coverage:",
  counts,
);
