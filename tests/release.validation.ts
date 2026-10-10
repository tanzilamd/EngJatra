import { it, expect } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { sha } from "../scripts/content-tools";
// The release artifact needs a current production build, so this check is run separately after build.
it("release export creates a separate immutable version, preserves old assets, and rejects private/stale edits", () => {
  if (!existsSync("apps/student-web/dist/content/manifest.json"))
    throw Error("Run npm run build before release validation");
  const dir = mkdtempSync(join(tmpdir(), "engjatra-release-test-"));
  try {
    const source = "apps/student-web/dist/content";
    const current = JSON.parse(readFileSync(`${source}/manifest.json`, "utf8"))
      .version as string;
    const parts = current.split(".").map(Number);
    const next = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    const following = `${parts[0]}.${parts[1]}.${parts[2] + 2}`;
    const unit = JSON.parse(
      readFileSync(`${source}/${current}/P0/P0-01.json`, "utf8"),
    );
    unit.title_bn = "হ্যালো বলি — নতুন অনুশীলন";
    const input = join(dir, "changes.local.json");
    writeFileSync(
      input,
      JSON.stringify({
        patches: [{ unit_id: unit.id, base_release: current, unit }],
      }),
    );
    const output = join(dir, "site");
    const command = spawnSync(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/release.ts",
        input,
        next,
        output,
      ],
      { encoding: "utf8" },
    );
    expect(command.status, command.stderr).toBe(0);
    const manifest = JSON.parse(
      readFileSync(join(output, "content/manifest.json"), "utf8"),
    );
    expect(manifest.version).toBe(next);
    expect(existsSync(join(output, "content/3.0.0/P0/P0-01.json"))).toBe(true);
    const patched = readFileSync(
      join(output, `content/${next}/P0/P0-01.json`),
      "utf8",
    );
    expect(JSON.parse(patched).title_bn).toBe(unit.title_bn);
    expect(manifest.levels[0].units[0].sha256).toBe(sha(patched));
    writeFileSync(
      input,
      JSON.stringify({
        patches: [{ unit_id: unit.id, base_release: next, unit }],
      }),
    );
    const second = join(dir, "second");
    expect(
      spawnSync(
        process.execPath,
        [
          "node_modules/tsx/dist/cli.mjs",
          "scripts/release.ts",
          input,
          following,
          second,
          output,
        ],
        { encoding: "utf8" },
      ).status,
    ).toBe(0);
    expect(existsSync(join(second, "content/3.0.0/P0/P0-01.json"))).toBe(true);
    expect(existsSync(join(second, `content/${next}/P0/P0-01.json`))).toBe(
      true,
    );
    expect(
      JSON.parse(readFileSync(join(second, "content/manifest.json"), "utf8"))
        .version,
    ).toBe(following);
    writeFileSync(
      input,
      JSON.stringify({
        patches: [{ unit_id: unit.id, base_release: "2.0.0", unit }],
      }),
    );
    expect(
      spawnSync(process.execPath, [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/release.ts",
        input,
        following,
        join(dir, "stale"),
      ]).status,
    ).not.toBe(0);
    writeFileSync(
      input,
      JSON.stringify({
        patches: [
          {
            unit_id: unit.id,
            base_release: current,
            unit: { ...unit, admin_notes: "private" },
          },
        ],
      }),
    );
    expect(
      spawnSync(process.execPath, [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/release.ts",
        input,
        following,
        join(dir, "leak"),
      ]).status,
    ).not.toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
