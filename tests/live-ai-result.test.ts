import { it, expect } from "vitest";
import {
  validateProductionTutor,
  validateProductionFollowup,
} from "../scripts/live-ai-result";
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
    { reply: { ...reply, next_question_en: "What is your name?" } },
    { reply: { ...reply, assistant_reply_en: "learner@example.com" } },
    { reply: { ...reply, feedback_type: "none" } },
    { reply: { ...reply, feedback_type: "suggestion" } },
    { reply: { ...reply, suggested_revision_en: "Hello!" } },
    { reply: { ...reply, suggested_revision_en: "I goes to the market." } },
    { reply: { ...reply, short_explanation_bn: "" } },
  ])
    expect(() => validateProductionTutor(data, "BD")).toThrow();
  expect(() => validateProductionTutor({ reply }, "GB")).toThrow();
});

it("contextual production follow-up accepts valid writing and reports only known public failures", () => {
  const reply = {
    assistant_reply_en: "Nice!",
    short_explanation_bn: "বাক্যটি ঠিক আছে।",
    feedback_type: "none",
    suggested_revision_en: null,
    next_question_en: "What fruit do you like?",
    learning_tags: ["vocabulary"],
    source_unit_id: "P0-01",
  };
  expect(validateProductionFollowup({ reply })).toEqual(reply);
  for (const data of [
    { reply: { ...reply, feedback_type: "clear_error" } },
    { reply: { ...reply, source_unit_id: "P0-02" } },
    { reply, local_demo: true },
  ])
    expect(() => validateProductionFollowup(data)).toThrow();
  expect(() =>
    validateProductionFollowup({ error: "AI_NETWORK_FAILURE" }),
  ).toThrow("AI_NETWORK_FAILURE");
  try {
    validateProductionFollowup({
      error: "private untrusted value",
      private_key: "private-test-key",
    });
  } catch (e) {
    expect((e as Error).message).toContain("INVALID_TUTOR_RESPONSE");
    expect((e as Error).message).not.toMatch(/private|key/);
  }
});
