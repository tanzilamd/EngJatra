import {
  readdir,
  readFile,
  cp,
  writeFile,
  mkdir,
  access,
} from "node:fs/promises";
import { join } from "node:path";
import { Manifest } from "../packages/contracts/content";
import { digest } from "./deployment-verify";
export async function preserveContent(
  baseline: string,
  output = "apps/student-web/dist",
) {
  const previous = Manifest.parse(
    JSON.parse(await readFile(`${baseline}/content/manifest.json`, "utf8")),
  );
  const current = Manifest.parse(
    JSON.parse(await readFile(`${output}/content/manifest.json`, "utf8")),
  );
  async function merge(from: string, to: string) {
    await mkdir(to, { recursive: true });
    for (const entry of await readdir(from, { withFileTypes: true })) {
      const source = join(from, entry.name),
        dest = join(to, entry.name);
      if (entry.isSymbolicLink())
        throw Error("Unexpected symlink in content baseline");
      if (entry.isDirectory()) await merge(source, dest);
      else {
        if (!entry.name.endsWith(".json"))
          throw Error("Unexpected non-JSON file in content baseline");
        try {
          await access(dest);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            await cp(source, dest);
            continue;
          }
          throw error;
        }
        if (
          digest(await readFile(source, "utf8")) !==
          digest(await readFile(dest, "utf8"))
        )
          throw Error(
            "Immutable content changed: bump the content version instead of overwriting it",
          );
      }
    }
  }
  for (const entry of await readdir(`${baseline}/content`, {
    withFileTypes: true,
  })) {
    if (entry.name === "manifest.json") continue;
    if (!entry.isDirectory() || !/^\d+\.\d+\.\d+$/.test(entry.name))
      throw Error("Unexpected content release directory");
    await merge(
      `${baseline}/content/${entry.name}`,
      `${output}/content/${entry.name}`,
    );
  }
  const old = previous.version.split(".").map(Number),
    next = current.version.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (next[i] === old[i]) continue;
    if (next[i] < old[i])
      await cp(
        `${baseline}/content/manifest.json`,
        `${output}/content/manifest.json`,
      );
    break;
  }
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
}
