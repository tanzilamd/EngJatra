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
import { normalizeUnit, sha } from "../scripts/content-tools";
// The release artifact needs a current production build, so this check is run separately after build.
it("release export creates a separate immutable version, preserves old assets, and rejects private/stale edits", () => {
  if (!existsSync("apps/student-web/dist/content/manifest.json"))
    throw Error("Run npm run build before release validation");
  const dir = mkdtempSync(join(tmpdir(), "engjatra-release-test-"));
  try {
    const unit = normalizeUnit(
      JSON.parse(readFileSync("content/units-public/P0/P0-01.json", "utf8")),
    );
    unit.title_bn = "হ্যালো বলি — নতুন অনুশীলন";
    const input = join(dir, "changes.local.json");
    writeFileSync(
      input,
      JSON.stringify({
        patches: [{ unit_id: unit.id, base_release: "3.0.0", unit }],
      }),
    );
    const output = join(dir, "site");
    const command = spawnSync(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/release.ts",
        input,
        "3.0.1",
        output,
      ],
      { encoding: "utf8" },
    );
    expect(command.status, command.stderr).toBe(0);
    const manifest = JSON.parse(
      readFileSync(join(output, "content/manifest.json"), "utf8"),
    );
    expect(manifest.version).toBe("3.0.1");
    expect(existsSync(join(output, "content/3.0.0/P0/P0-01.json"))).toBe(true);
    const patched = readFileSync(
      join(output, "content/3.0.1/P0/P0-01.json"),
      "utf8",
    );
    expect(JSON.parse(patched).title_bn).toBe(unit.title_bn);
    expect(manifest.levels[0].units[0].sha256).toBe(sha(patched));
    writeFileSync(
      input,
      JSON.stringify({
        patches: [{ unit_id: unit.id, base_release: "3.0.1", unit }],
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
          "3.0.2",
          second,
          output,
        ],
        { encoding: "utf8" },
      ).status,
    ).toBe(0);
    expect(existsSync(join(second, "content/3.0.0/P0/P0-01.json"))).toBe(true);
    expect(existsSync(join(second, "content/3.0.1/P0/P0-01.json"))).toBe(true);
    expect(
      JSON.parse(readFileSync(join(second, "content/manifest.json"), "utf8"))
        .version,
    ).toBe("3.0.2");
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
        "3.0.2",
        join(dir, "stale"),
      ]).status,
    ).not.toBe(0);
    writeFileSync(
      input,
      JSON.stringify({
        patches: [
          {
            unit_id: unit.id,
            base_release: "3.0.0",
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
        "3.0.2",
        join(dir, "leak"),
      ]).status,
    ).not.toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
