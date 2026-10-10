import { z } from "zod";
import { TutorReply, messages } from "../packages/contracts/api";
import {
  asksForPersonalData,
  containsPrivateInput,
  googleCountries,
} from "../workers/api/src/ai-policy";
import { correctsSyntheticSentence } from "./qa-tutor-correction";

function productionReply(data: unknown) {
  const parsed = z.object({ reply: TutorReply }).strict().safeParse(data);
  if (parsed.success) {
    const reply = parsed.data.reply;
    if (
      [
        reply.assistant_reply_en,
        reply.short_explanation_bn,
        reply.suggested_revision_en ?? "",
        reply.next_question_en,
      ].some((text) => containsPrivateInput(text) || asksForPersonalData(text))
    )
      throw Error("Production tutor failed the personal-data output safeguard");
    return reply;
  }
  const code =
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string" &&
    Object.hasOwn(messages, data.error)
      ? data.error
      : "INVALID_TUTOR_RESPONSE";
  throw Error(
    `Production tutor did not verify inference or regional denial: ${code}`,
  );
}

// The second fixed authored sentence is already valid; don't certify a tutor
// that invents a definite grammar error or changes the source lesson.
export function validateProductionFollowup(data: unknown) {
  const reply = productionReply(data);
  if (reply.source_unit_id !== "P0-01" || reply.feedback_type === "clear_error")
    throw Error("Production tutor did not accept the valid authored follow-up");
  return reply;
}

// Classify real production evidence without bypassing regional policy or
// relabeling denial as successful inference. No raw replies in the report.
export function validateProductionTutor(data: unknown, countries: string) {
  const selected = googleCountries(countries);
  if (!selected.length) throw Error("No reviewed production AI country policy");
  const denied = z
    .object({
      error: z.literal("AI_REGION_UNAVAILABLE"),
      fallback_activity: z.string().regex(/^P0-01-/),
      country: z.string().regex(/^(?:[A-Z]{2}|unknown)$/),
    })
    .strict()
    .safeParse(data);
  if (denied.success) {
    if (selected.includes(denied.data.country))
      throw Error("Selected production AI country was unexpectedly denied");
    return {
      inference_verified: false as const,
      regional_denial_verified: true as const,
      country: denied.data.country,
    };
  }
  const reply = productionReply(data);
  if (reply.source_unit_id !== "P0-01" || !correctsSyntheticSentence(reply))
    throw Error(
      "Real production AI did not return a valid bilingual correction",
    );
  return {
    inference_verified: true as const,
    regional_denial_verified: false as const,
    reply,
  };
}
