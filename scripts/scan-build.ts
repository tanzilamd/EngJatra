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
    if (/\.(js|json|html)$/.test(p)) {
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
