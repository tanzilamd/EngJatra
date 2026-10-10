import { it, expect } from "vitest";
import {
  googleCountries,
  googleCountryAllowed,
  containsPrivateInput,
} from "../workers/api/src/ai-policy";
import { parseReply } from "../workers/api/src/ai";
import { TutorInput } from "../packages/contracts/api";
it("unknown, paid-only and missing regions fail closed; only reviewed selected countries match", () => {
  expect(googleCountries("BD,US,BD")).toEqual(["BD", "US"]);
  for (const value of [
    undefined,
    "",
    "GB",
    "CH",
    "DE",
    "BD,ZZ",
    "XX",
    "BD,IN,GB",
  ])
    expect(googleCountries(value)).toEqual([]);
  expect(googleCountryAllowed("BD,US", "BD")).toBe(true);
  expect(googleCountryAllowed("BD,US", "IN")).toBe(false);
  expect(googleCountryAllowed("BD,US")).toBe(false);
});
it("recognizable contact details and credentials in current or previous messages are rejected", () => {
  for (const text of [
    "Email me at learner@example.com",
    "Call +880 1712 345678",
    "আমার নম্বর ০১৭১২৩৪৫৬৭৮",
    "sb_secret_fixture",
    "-----BEGIN PRIVATE KEY-----",
  ])
    expect(containsPrivateInput(text)).toBe(true);
  expect(containsPrivateInput("I have two friends. I study at 8.")).toBe(false);
});
it("consent defaults false and reply rejects empty/transliterated Bengali or private output", () => {
  expect(
    TutorInput.parse({ unit_id: "P0-01", release: "3.0.1", text: "Hello" })
      .ai_consent,
  ).toBe(false);
  const reply = {
    assistant_reply_en: "Hello!",
    short_explanation_bn: "ভালো শুরু।",
    feedback_type: "none",
    suggested_revision_en: null,
    next_question_en: "How are you?",
    learning_tags: ["writing"],
    source_unit_id: "P0-01",
  };
  for (const change of [
    { short_explanation_bn: "" },
    { short_explanation_bn: "bhalo" },
    { assistant_reply_en: "learner@example.com" },
    { next_question_en: "???" },
  ])
    expect(() =>
      parseReply(JSON.stringify({ ...reply, ...change }), "P0-01"),
    ).toThrow();
});
