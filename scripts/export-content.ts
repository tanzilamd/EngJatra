import { mkdir, writeFile, readFile, cp } from "node:fs/promises";
import { join } from "node:path";
import { bands } from "../packages/learning/engine";
import { Library, Manifest } from "../packages/contracts/content";
import { readJson, normalizeUnit, sha, scan } from "./content-tools";
const source = async (name: string) =>
  await readJson(`content/source/${name}.json`);
const groups = (await source("level_groups")) as {
  id: string;
  name_bn: string;
  goal: string;
}[];
const levels = [];
const vocabularySource = (await source("vocabulary")) as {
  id: string;
  en: string;
  bn: string;
  units: string[];
}[];
const version = "3.0.0";
const base = "apps/student-web/public";
for (const band of bands) {
  const units = [];
  await mkdir(`${base}/content/${version}/${band}`, { recursive: true });
  for (let n = 1; n <= 16; n++) {
    const id = `${band}-${String(n).padStart(2, "0")}`;
    const unit = normalizeUnit(
      await readJson(`content/units-public/${band}/${id}.json`),
    );
    unit.vocabulary = unit.vocabulary.map((w) => ({
      ...w,
      id:
        vocabularySource.find(
          (v) =>
            v.en.toLowerCase() === w.en.toLowerCase() &&
            v.bn === w.bn &&
            v.units.includes(unit.id),
        )?.id ?? `${unit.id}:${w.en}`,
    }));
    const body = JSON.stringify(unit);
    await writeFile(`${base}/content/${version}/${band}/${id}.json`, body);
    units.push({
      id,
      title_bn: unit.title_bn,
      goal_bn: unit.goal_bn,
      sha256: sha(body),
    });
  }
  const library = Library.parse({
    grammar: ((await source("grammar")) as { level: string }[]).filter(
      (x) => x.level === band,
    ),
    vocabulary: (
      (await source("vocabulary")) as { learning_level_suggested: string }[]
    ).filter((x) => x.learning_level_suggested === band),
    readings: (
      (await source("extended_readings")) as { level: string }[]
    ).filter((x) => x.level === band),
    conversations: (
      (await source("conversations")) as { level: string }[]
    ).filter((x) => x.level === band),
    checkpoint: (
      (await source("formative_checkpoints")) as { level: string }[]
    ).find((x) => x.level === band),
    resources: await source("external_practice_resources"),
  });
  scan(library);
  await writeFile(
    `${base}/content/${version}/${band}/library.json`,
    JSON.stringify(library),
  );
  const group = groups.find((g) => g.id === band)!;
  levels.push({ id: band, name_bn: group.name_bn, goal: group.goal, units });
}
const manifest = Manifest.parse({ version, levels });
await writeFile(`${base}/content/manifest.json`, JSON.stringify(manifest));
for (const app of ["student-web", "admin-web"]) {
  const dest = join("apps", app, "public");
  await mkdir(`${dest}/brand`, { recursive: true });
  await cp("brand", `${dest}/brand`, { recursive: true });
  await writeFile(`${dest}/_redirects`, "/* /index.html 200\n");
  await writeFile(
    `${dest}/_headers`,
    await readFile("scripts/security-headers.txt", "utf8"),
  );
}
console.log("Exported 96 validated units and six segmented libraries.");

await cp("scripts/public-sw.js", `${base}/sw.js`);
