import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Library } from "../packages/contracts/content";
import { bands } from "../packages/learning/engine";
import {
  applyLibrarySupplements,
  ContentRelease,
} from "../scripts/content-releases";

const release = ContentRelease.parse(
  JSON.parse(readFileSync("content/releases/3.0.1.json", "utf8")),
);
const base = (band: string) =>
  Library.parse(
    JSON.parse(
      readFileSync(
        `apps/student-web/public/content/3.0.0/${band}/library.json`,
        "utf8",
      ),
    ),
  );

describe("immutable teaching supplements", () => {
  it("completes every Pre-A1 sense example through additive releases without overwriting published teaching", () => {
    let before = Library.parse(
      JSON.parse(
        readFileSync(
          "apps/student-web/public/content/3.0.1/P0/library.json",
          "utf8",
        ),
      ),
    );
    const original = structuredClone(before);
    let added = 0;
    for (const version of ["3.0.2", "3.0.3"]) {
      const next = ContentRelease.parse(
        JSON.parse(readFileSync(`content/releases/${version}.json`, "utf8")),
      );
      expect(
        next.patches.every(
          (p) => p.kind === "vocabulary_example" && p.level === "P0",
        ),
      ).toBe(true);
      added += next.patches.length;
      before = applyLibrarySupplements(before, next, "P0");
      expect(
        Library.parse(
          JSON.parse(
            readFileSync(
              `apps/student-web/public/content/${version}/P0/library.json`,
              "utf8",
            ),
          ),
        ),
      ).toEqual(before);
    }
    expect(added).toBe(134);
    expect(before.vocabulary).toHaveLength(154);
    for (const [i, word] of before.vocabulary.entries()) {
      expect(word.english_example).toBeTruthy();
      expect({
        ...word,
        english_example: original.vocabulary[i].english_example,
      }).toEqual(original.vocabulary[i]);
      if (original.vocabulary[i].english_example)
        expect(word.english_example).toBe(
          original.vocabulary[i].english_example,
        );
    }
    expect({ ...before, vocabulary: original.vocabulary }).toEqual(original);
    expect(
      before.vocabulary.find((v) => v.id === "VOC-0284")?.english_example,
    ).toBe("I can see her.");
    expect(
      before.vocabulary.find((v) => v.id === "VOC-0096")?.english_example,
    ).toBe("Please call the teacher into the room.");
    expect(
      new Set(
        before.vocabulary
          .filter((v) => v.en === "desk")
          .map((v) => v.english_example),
      ).size,
    ).toBe(2);
  });

  it("retains all 96 unit bytes and untouched higher-band libraries across the new source chain", () => {
    for (const version of ["3.0.2", "3.0.3"])
      for (const band of bands) {
        for (let i = 1; i <= 16; i++) {
          const file = `${band}/${band}-${String(i).padStart(2, "0")}.json`;
          expect(
            readFileSync(`apps/student-web/public/content/${version}/${file}`),
          ).toEqual(
            readFileSync(`apps/student-web/public/content/3.0.1/${file}`),
          );
        }
        if (band !== "P0")
          expect(
            readFileSync(
              `apps/student-web/public/content/${version}/${band}/library.json`,
            ),
          ).toEqual(
            readFileSync(
              `apps/student-web/public/content/3.0.1/${band}/library.json`,
            ),
          );
      }
  });

  it("adds all 36 translations and seven sense-anchored examples without changing units, IDs, bands or answers", () => {
    let missingTranslations = 0,
      addedExamples = 0;
    for (const band of bands) {
      const before = base(band);
      const serialized = JSON.stringify(before);
      const after = applyLibrarySupplements(before, release, band);
      expect(
        Library.parse(
          JSON.parse(
            readFileSync(
              `apps/student-web/public/content/3.0.1/${band}/library.json`,
              "utf8",
            ),
          ),
        ),
      ).toEqual(after);
      expect(JSON.stringify(before)).toBe(serialized);
      expect(after.grammar.map((g) => g.id)).toEqual(
        before.grammar.map((g) => g.id),
      );
      expect(after.vocabulary.map((v) => v.id)).toEqual(
        before.vocabulary.map((v) => v.id),
      );
      for (const [i, item] of after.grammar.entries()) {
        expect(item.example_en).toBe(before.grammar[i].example_en);
        expect(item.unit_id).toBe(before.grammar[i].unit_id);
        expect(item.rule_bn).toBe(before.grammar[i].rule_bn);
        if (!item.example_bn) missingTranslations++;
      }
      for (const [i, item] of after.vocabulary.entries()) {
        const original = before.vocabulary[i];
        expect({ ...item, english_example: original.english_example }).toEqual(
          original,
        );
        if (item.english_example && !original.english_example) addedExamples++;
      }
      expect(after.readings).toEqual(before.readings);
      expect(after.conversations).toEqual(before.conversations);
      expect(after.checkpoint).toEqual(before.checkpoint);
      for (let i = 1; i <= 16; i++) {
        const file = `${band}/${band}-${String(i).padStart(2, "0")}.json`;
        expect(
          readFileSync(`apps/student-web/public/content/3.0.1/${file}`),
        ).toEqual(
          readFileSync(`apps/student-web/public/content/3.0.0/${file}`),
        );
      }
    }
    expect(missingTranslations).toBe(0);
    expect(addedExamples).toBe(7);
  });

  it("rejects changed English, wrong senses, existing translations, duplicates and private fields", () => {
    const original = base("P0");
    const translation = release.patches.find(
      (p) => p.kind === "grammar_translation" && p.id === "P0-G01",
    )!;
    const vocabulary = release.patches.find(
      (p) => p.kind === "vocabulary_example" && p.level === "P0",
    )!;
    const check = (patches: unknown[]) =>
      applyLibrarySupplements(original, { ...release, patches }, "P0");
    expect(() =>
      check([{ ...translation, expected: "Different meaning." }]),
    ).toThrow("Changed example");
    expect(() => check([{ ...vocabulary, expected_bn: "অন্য অর্থ" }])).toThrow(
      "vocabulary sense",
    );
    expect(() => check([translation, translation])).toThrow("Duplicate");
    expect(() => check([{ ...translation, admin_notes: "private" }])).toThrow(
      "Private field",
    );
    expect(() => check([{ ...translation, value: "No Bengali" }])).toThrow(
      "Bengali",
    );
    const changed = applyLibrarySupplements(
      original,
      { ...release, patches: [translation] },
      "P0",
    );
    expect(() =>
      applyLibrarySupplements(
        changed,
        { ...release, patches: [translation] },
        "P0",
      ),
    ).toThrow("existing grammar translation");
  });

  it("preserves short-answer context, non-defining information and the two explicit caveat corrections", () => {
    const p0 = applyLibrarySupplements(base("P0"), release, "P0");
    expect(p0.grammar.find((g) => g.id === "P0-G04")?.example_bn).toContain(
      "আগের প্রশ্ন",
    );
    expect(p0.grammar.find((g) => g.id === "P0-G06")?.caveat_bn).toContain(
      "their",
    );
    const b2 = applyLibrarySupplements(base("B2"), release, "B2");
    expect(b2.grammar.find((g) => g.id === "B2-G04")?.caveat_bn).toContain(
      "বর্তমান সত্য",
    );
    expect(b2.grammar.find((g) => g.id === "B2-G05")?.example_bn).toContain(
      "রাজশাহীতে থাকে",
    );
  });
});
