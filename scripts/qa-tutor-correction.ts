import type { TutorData } from "../packages/contracts/api";

// Only the fixed authored QA sentence, never general learner answer grading.
// A valid envelope with an unrelated revision must not certify tutoring.
export function correctsSyntheticSentence(reply: TutorData) {
  return (
    reply.feedback_type === "clear_error" &&
    /^I go to the market[.!]?$/.test(reply.suggested_revision_en?.trim() ?? "")
  );
}
