import { gzipSync } from "node:zlib";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { scan } from "./content-tools";
import { scanPublicText } from "./public-security";
async function files(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const result = [];
  for (const e of entries) {
    const p = join(root, e.name);
    if (e.isDirectory()) result.push(...(await files(p)));
    else result.push(p);
  }
  return result;
}
for (const site of ["student-web", "admin-web"])
  for (const p of await files(`apps/${site}/dist`)) {
    if (p.endsWith(".map")) throw Error("Public source map found");
    if (/\.(js|json|html|css|webmanifest|svg)$/.test(p)) {
      const text = await readFile(p, "utf8");
      scanPublicText(text);
      if (site === "student-web") {
        if (p.endsWith(".json")) scan(JSON.parse(text));
        else if (
          /publication_status|human_reviewed|review_status|admin_notes|internal_notes|expert_verified/.test(
            text,
          )
        )
          throw Error(`Private labels in student bundle ${p}`);
      }
      if (
        text.includes("X-Local-Role") ||
        text.includes("engjatra.demo.started")
      )
        throw Error(`Demo bypass code in production ${p}`);
    }
  }
console.log(
  "PASS both production artifacts: no demo authentication, secret patterns, source maps; student metadata isolated.",
);

for (const site of ["student-web", "admin-web"]) {
  const root = `apps/${site}/dist`;
  const html = await readFile(`${root}/index.html`, "utf8");
  const urls = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="(\/[^" ]+\.(?:js|css))"/g)].map(
        (match) => match[1],
      ),
    ),
  ];
  let js = 0,
    css = 0;
  for (const url of urls) {
    const bytes = gzipSync(await readFile(`${root}${url}`)).length;
    if (url.endsWith(".js")) js += bytes;
    else css += bytes;
  }
  if (js > 140 * 1024 || css > 10 * 1024)
    throw Error(
      `${site} initial gzip budget exceeded: JS ${js} bytes, CSS ${css} bytes`,
    );
  console.log(
    `PASS ${site} initial gzip budget: JS ${js} bytes / 140 KiB; CSS ${css} bytes / 10 KiB`,
  );
}
