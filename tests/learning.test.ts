import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeUnit, scan } from "../scripts/content-tools";
import {
  bands,
  nextUnit,
  normalize,
  score,
  review,
  mergeProgress,
} from "../packages/learning/engine";
import { initialProgress } from "../packages/contracts/api";
const first = normalizeUnit(
  JSON.parse(readFileSync("content/units-public/P0/P0-01.json", "utf8")),
);
describe("learning contracts", () => {
  for (const band of bands)
    it(`all sixteen ${band} units accept authored answers and reject incorrect choices`, () => {
      for (let n = 1; n <= 16; n++) {
        const id = `${band}-${String(n).padStart(2, "0")}`;
        const u = normalizeUnit(
          JSON.parse(
            readFileSync(`content/units-public/${band}/${id}.json`, "utf8"),
          ),
        );
        for (const a of u.exercises) {
          if (a.options) {
            expect(score(a, a.correct_index!)).toBe(true);
            expect(score(a, (a.correct_index! + 1) % a.options.length)).toBe(
              false,
            );
          }
          if (!a.auto_graded) {
            expect(
              score(a, "A completely different valid paragraph."),
            ).toBeNull();
          }
        }
      }
    });
  it("normalizes whitespace and unicode without deleting punctuation", () => {
    expect(normalize("  Hello,   I am Rina. ")).toBe("hello, i am rina.");
    expect(normalize("Hello.")).not.toBe(normalize("Hello"));
  });
  it("accepts authored sentence alternatives", () => {
    const a = first.exercises.find((a) => a.type === "word_order")!;
    expect(
      score(
        { ...a, accepted_answers: ["I am Rina. Hello,"] },
        "I am Rina. Hello,",
      ),
    ).toBe(true);
    expect(score(a, "Rina I am")).toBe(false);
  });
  it("matches every pair, never a partial match", () => {
    const a = first.exercises.find((a) => a.type === "vocab_match")!;
    expect(
      score(a, Object.fromEntries(a.pairs!.map((p) => [p.en, p.bn]))),
    ).toBe(true);
    expect(score(a, { hello: "হ্যালো" })).toBe(false);
  });
  it("advances across every level and keeps final unit stable", () => {
    expect(nextUnit("P0-16")).toBe("A1-01");
    expect(nextUnit("C1-16")).toBe("C1-16");
    expect(nextUnit("B1-09")).toBe("B1-10");
  });
  it("spaces recall while keeping self assessment separate", () => {
    expect(review(0, true, 0)).toEqual({
      stage: 1,
      due_at: "1970-01-02T00:00:00.000Z",
    });
    expect(review(3, false, 0).stage).toBe(0);
    expect(review(4, true, 0).stage).toBe(4);
  });
  it("merges completions without deleting either device words and mistakes", () => {
    const one = {
      ...initialProgress,
      completed: ["P0-01"],
      words: [
        {
          sense_id: "a",
          en: "hi",
          bn: "হাই",
          unit_id: "P0-01",
          stage: 1,
          due_at: new Date().toISOString(),
        },
      ],
    };
    const two = { ...initialProgress, completed: ["A1-01"] };
    expect(mergeProgress(one, two).completed).toEqual(["P0-01", "A1-01"]);
    expect(mergeProgress(one, two).words).toHaveLength(1);
  });
  it("rejects nested private metadata before export", () => {
    expect(() => scan({ safe: [{ admin_notes: "secret" }] })).toThrow();
    expect(() => scan({ review_steps_bn: ["নিজের লেখা দেখো"] })).not.toThrow();
  });
});
