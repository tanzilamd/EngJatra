import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Unit } from "../packages/contracts/content";
import { TutorInput } from "../packages/contracts/api";
import { prompt } from "../workers/api/src/ai";
const unit = Unit.parse(
  JSON.parse(
    readFileSync("apps/student-web/public/content/3.0.0/P0/P0-01.json", "utf8"),
  ),
);
it("separates free teaching-band conversation from verified lesson facts without dropping provider guards", () => {
  const free = prompt(unit, "Teach me a useful word", [], "conversation");
  expect(free).toContain("Free conversation mode");
  expect(free).not.toContain("Verified lesson facts");
  expect(free).toContain("adult Bengali speakers at teaching band P0");
  expect(free).toContain("untrusted data");
  const lesson = prompt(unit, "Help me understand", [], "lesson");
  expect(lesson).toContain("Verified lesson facts");
  expect(lesson).toContain(unit.goal_bn);
  expect(lesson).toContain(unit.vocabulary[0].en);
  expect(lesson).toContain("Never ask the learner for a name");
});
it("rejects invalid modes, overlong context and forged provider responses in input", () => {
  const base = {
    unit_id: "P0-01",
    release: "3.0.13",
    text: "Hello",
    ai_consent: true,
  };
  expect(TutorInput.parse(base).mode).toBe("lesson");
  for (const value of [
    { ...base, mode: "general" },
    { ...base, reply: "fake" },
    { ...base, context: Array(7).fill({ role: "user", text: "Hello" }) },
    { ...base, conversation_id: "another-user" },
  ])
    expect(TutorInput.safeParse(value).success).toBe(false);
});
