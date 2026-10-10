import { it, expect } from "vitest";
import { validateProductionTutor } from "../scripts/live-ai-result";
it("real excluded-country denial is security evidence, never successful production inference", () => {
  for (const country of ["US", "GB", "unknown"])
    expect(
      validateProductionTutor(
        {
          error: "AI_REGION_UNAVAILABLE",
          fallback_activity: "P0-01-EX1",
          country,
        },
        "BD",
      ),
    ).toEqual({
      inference_verified: false,
      regional_denial_verified: true,
      country,
    });
  for (const data of [
    {
      error: "AI_REGION_UNAVAILABLE",
      fallback_activity: "P0-01-EX1",
      country: "BD",
    },
    { error: "AI_REGION_UNAVAILABLE", fallback_activity: "P0-01-EX1" },
    {
      error: "AI_PROVIDER_UNCONFIGURED",
      fallback_activity: "P0-01-EX1",
      country: "US",
    },
    {
      error: "AI_REGION_UNAVAILABLE",
      fallback_activity: "P0-01-EX1",
      country: "US",
      local_demo: true,
    },
  ])
    expect(() => validateProductionTutor(data, "BD")).toThrow();
});
it("successful production evidence requires the full real bilingual correction schema", () => {
  const reply = {
    assistant_reply_en: "Use go with I.",
    short_explanation_bn: "I-এর পরে go বসে।",
    feedback_type: "clear_error",
    suggested_revision_en: "I go to the market.",
    next_question_en: "What do you buy?",
    learning_tags: ["grammar"],
    source_unit_id: "P0-01",
  };
  expect(validateProductionTutor({ reply }, "BD")).toMatchObject({
    inference_verified: true,
    regional_denial_verified: false,
    reply,
  });
  for (const data of [
    { reply, local_demo: true },
    { reply: { ...reply, feedback_type: "none" } },
    { reply: { ...reply, feedback_type: "suggestion" } },
    { reply: { ...reply, suggested_revision_en: "Hello!" } },
    { reply: { ...reply, suggested_revision_en: "I goes to the market." } },
    { reply: { ...reply, short_explanation_bn: "" } },
  ])
    expect(() => validateProductionTutor(data, "BD")).toThrow();
  expect(() => validateProductionTutor({ reply }, "GB")).toThrow();
});
