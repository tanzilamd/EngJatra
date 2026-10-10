import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import {
  applyContentRelease,
  validateUnitPatch,
} from "../scripts/content-releases";
import { sha } from "../scripts/content-tools";

const original = readFileSync(
  "apps/student-web/public/content/3.0.1/P0/P0-01.json",
  "utf8",
);
const edited = () => ({
  ...JSON.parse(original),
  title_bn: "হ্যালো বলি — নতুন ব্যাখ্যা",
});
const patch = () => ({
  kind: "unit",
  id: "P0-01",
  level: "P0",
  expected_sha256: sha(original),
  value: edited(),
});

it("accepts a meaning-preserving unit edit with anchored hash and unchanged activity/saved-word identities", () => {
  const result = validateUnitPatch(original, patch());
  expect(result.unit.title_bn).toBe(edited().title_bn);
  expect(result.unit.exercises).toEqual(JSON.parse(original).exercises);
  expect(result.unit.vocabulary).toEqual(JSON.parse(original).vocabulary);
});

it("rejects stale hashes, changed identities, removed activities/words and private metadata", () => {
  expect(() =>
    validateUnitPatch(original, {
      ...patch(),
      expected_sha256: "0".repeat(64),
    }),
  ).toThrow("Stale unit hash");
  expect(() =>
    validateUnitPatch(original, { ...patch(), id: "P0-02" }),
  ).toThrow("identity changed");
  const fewerActivities = edited();
  fewerActivities.exercises.pop();
  expect(() =>
    validateUnitPatch(original, { ...patch(), value: fewerActivities }),
  ).toThrow("Activity identities");
  const fewerWords = edited();
  fewerWords.vocabulary.pop();
  expect(() =>
    validateUnitPatch(original, { ...patch(), value: fewerWords }),
  ).toThrow("Saved vocabulary");
  expect(() =>
    validateUnitPatch(original, {
      ...patch(),
      value: { ...edited(), admin_notes: "private" },
    }),
  ).toThrow("Private field");
});

it("prepares approved drafts for the sole source publisher, retains old bytes and rejects stale/duplicate/overwrite attempts", async () => {
  const root = await mkdtemp(join(tmpdir(), "engjatra-source-release-"));
  try {
    const input = `${root}/changes.local.json`,
      output = `${root}/3.0.2.json`;
    await writeFile(
      input,
      JSON.stringify({
        patches: [{ unit_id: "P0-01", base_release: "3.0.1", unit: edited() }],
      }),
    );
    const prepare = () =>
      spawnSync(
        process.execPath,
        [
          "node_modules/tsx/dist/cli.mjs",
          "scripts/prepare-release.ts",
          input,
          "3.0.2",
          output,
          "apps/student-web/public",
        ],
        { encoding: "utf8" },
      );
    const result = prepare();
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      state: "prepared_only",
      published: false,
    });
    expect(prepare().status).not.toBe(0);
    await cp("apps/student-web/public/content", `${root}/content`, {
      recursive: true,
    });
    const release = JSON.parse(await readFile(output, "utf8"));
    const manifest = await applyContentRelease(root, release);
    expect(manifest.version).toBe("3.0.2");
    expect(manifest.levels[0].units[0].sha256).toBe(
      sha(await readFile(`${root}/content/3.0.2/P0/P0-01.json`, "utf8")),
    );
    expect(await readFile(`${root}/content/3.0.1/P0/P0-01.json`, "utf8")).toBe(
      original,
    );
    expect(await readFile(`${root}/content/3.0.0/P0/P0-01.json`, "utf8")).toBe(
      original,
    );
    expect(
      await readFile(`${root}/content/3.0.2/P0/library.json`, "utf8"),
    ).toBe(await readFile(`${root}/content/3.0.1/P0/library.json`, "utf8"));
    await expect(
      applyContentRelease(root, { ...release, version: "3.0.3" }),
    ).rejects.toThrow("baseline");
    await expect(
      applyContentRelease(root, {
        ...release,
        base_release: "3.0.2",
        version: "3.0.3",
        patches: [
          { ...patch(), expected_sha256: manifest.levels[0].units[0].sha256 },
          { ...patch(), expected_sha256: manifest.levels[0].units[0].sha256 },
        ],
      }),
    ).rejects.toThrow("Duplicate content patch");
    await rm(output);
    await writeFile(
      input,
      JSON.stringify({
        patches: [{ unit_id: "P0-01", base_release: "3.0.0", unit: edited() }],
      }),
    );
    expect(prepare().status).not.toBe(0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
