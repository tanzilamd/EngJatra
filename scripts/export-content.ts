import { mkdir, writeFile, readFile, cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { bands } from "../packages/learning/engine";
import { Library, Manifest } from "../packages/contracts/content";
import { readJson, normalizeUnit, sha, scan } from "./content-tools";
import { loadEnv } from "vite";
import { exportContentReleases } from "./content-releases";
const apiOrigin =
  process.env.VITE_API_URL ??
  loadEnv("production", process.cwd(), "VITE_API_URL").VITE_API_URL;
if (
  apiOrigin &&
  (new URL(apiOrigin).protocol !== "https:" ||
    new URL(apiOrigin).origin !== apiOrigin)
)
  throw Error("VITE_API_URL must be an HTTPS origin without a path");
const headers = (
  await readFile("scripts/security-headers.txt", "utf8")
).replace(
  "https://*.workers.dev;",
  `https://*.workers.dev${apiOrigin ? ` ${apiOrigin}` : ""};`,
);
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
const supplementaryVersions = await exportContentReleases(base);
for (const app of ["student-web", "admin-web"]) {
  const dest = join("apps", app, "public");
  await mkdir(`${dest}/brand`, { recursive: true });
  await cp("brand", `${dest}/brand`, { recursive: true });
  await rm(`${dest}/_redirects`, { force: true });
  await writeFile(
    `${dest}/_headers`,
    headers +
      supplementaryVersions
        .map(
          (v) =>
            `\n/content/${v}/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
        )
        .join(""),
  );
}
console.log("Exported 96 validated units and six segmented libraries.");

await cp("brand/pwa", `${base}/icons`, { recursive: true });
await cp("brand/manifest.webmanifest", `${base}/manifest.webmanifest`);

for (const app of ["student", "admin"]) {
  await cp("scripts/theme-init.js", `apps/${app}-web/public/theme-init.js`);
}
