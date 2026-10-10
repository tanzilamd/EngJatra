import { z } from "zod";
import { TutorReply, messages } from "../packages/contracts/api";
import { googleCountries } from "../workers/api/src/ai-policy";
import { correctsSyntheticSentence } from "./qa-tutor-correction";

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
  const successful = z.object({ reply: TutorReply }).strict().safeParse(data);
  if (!successful.success) {
    const code =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string" &&
      Object.hasOwn(messages, data.error)
        ? data.error
        : "INVALID_TUTOR_RESPONSE";
    // Only known public error codes, never raw response values/untrusted keys.
    throw Error(
      `Production tutor did not verify inference or regional denial: ${code}`,
    );
  }
  const reply = successful.data.reply;
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
