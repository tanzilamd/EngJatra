import { z } from "zod";
import { unitId } from "./content";
export const Release = z.string().regex(/^\d+\.\d+\.\d+$/);
export const ContextTurn = z
  .object({ role: z.enum(["user", "assistant"]), text: z.string().max(1000) })
  .strict();
export type TutorContext = z.infer<typeof ContextTurn>[];
export const TutorInput = z
  .object({
    unit_id: unitId,
    release: Release,
    text: z.string().trim().min(1).max(1500),
    context: z.array(ContextTurn).max(6).default([]),
  })
  .strict();
export const TutorReply = z
  .object({
    assistant_reply_en: z.string().min(1).max(1200),
    short_explanation_bn: z.string().max(700),
    feedback_type: z.enum(["none", "suggestion", "clear_error"]),
    suggested_revision_en: z.string().max(1000).nullable(),
    next_question_en: z.string().min(1).max(400),
    learning_tags: z
      .array(z.enum(["grammar", "vocabulary", "writing", "reading"]))
      .max(4),
    source_unit_id: unitId,
  })
  .strict();
export type TutorData = z.infer<typeof TutorReply>;
export const Report = z
  .object({
    unit_id: unitId,
    item_id: z.string().min(1).max(100),
    release: Release,
    category: z.enum([
      "translation",
      "grammar",
      "answer",
      "ai",
      "support",
      "deletion",
    ]),
    text: z.string().trim().min(5).max(1500),
  })
  .strict();
export const SavedWord = z.object({
  sense_id: z.string().min(1).max(120),
  en: z.string().max(100),
  bn: z.string().max(200),
  unit_id: unitId,
  stage: z.number().int().min(0).max(4),
  due_at: z.string().datetime(),
});
export const Mistake = z.object({
  unit_id: unitId,
  activity_id: z.string().max(100),
  skill: z.string().max(100),
});
export const Attempt = z.object({
  id: z.string().uuid(),
  unit_id: unitId,
  activity_id: z.string().min(1).max(100),
  release: Release,
  outcome: z.boolean().nullable(),
});
export const LearnerState = z.object({
  unit_id: unitId,
  step: z.number().int().min(0).max(30),
  release: Release,
  completed: z.array(unitId).max(96),
  words: z.array(SavedWord).max(1500),
  mistakes: z.array(Mistake).max(300),
  attempts: z.array(Attempt).max(300).default([]),
  onboarded: z.boolean(),
  tour: z.boolean(),
  hints: z.boolean(),
  large_text: z.boolean(),
  keep_history: z.boolean(),
});
export type Progress = z.infer<typeof LearnerState>;
export const CheckpointInput = z
  .object({
    expected_revision: z.number().int().nonnegative(),
    idempotency_key: z.string().uuid(),
    state: LearnerState,
  })
  .strict();
export const Snapshot = z.object({
  revision: z.number().int().nonnegative(),
  state: LearnerState,
});
export type SnapshotData = z.infer<typeof Snapshot>;
export const initialProgress: Progress = {
  unit_id: "P0-01",
  step: 0,
  release: "3.0.0",
  completed: [],
  words: [],
  mistakes: [],
  attempts: [],
  onboarded: false,
  tour: false,
  hints: true,
  large_text: false,
  keep_history: false,
};
export const messages: Record<string, string> = {
  AI_UNCLASSIFIED_429: "AI অনুরোধে সাময়িক সীমা এসেছে। কারণ নিশ্চিত হওয়া যায়নি।",
  AI_TIMEOUT: "AI উত্তর দিতে দেরি করছে। নিচের গল্পের অনুশীলন চালিয়ে যাও।",
  AI_NETWORK_FAILURE: "সংযোগে সমস্যা হচ্ছে। গল্পের অনুশীলন চালু আছে।",
  AI_PROVIDER_UNCONFIGURED:
    "AI অনুশীলন এখন পাওয়া যাচ্ছে না। গল্পের অনুশীলন চালিয়ে যাও।",
  AI_USER_FAIR_USE: "তোমার AI অনুশীলনের বরাদ্দ শেষ। অন্য অনুশীলনগুলো চালু আছে।",
  AI_INVALID_RESPONSE:
    "AI উত্তরটি ঠিকভাবে পাওয়া যায়নি। গল্পের অনুশীলন চালিয়ে যাও।",
  AI_REQUESTS_PER_MINUTE:
    "এই মিনিটে AI অনুশীলনের সীমা পূর্ণ হয়েছে। অন্য অনুশীলন চালিয়ে যাও।",
  AI_TOKENS_PER_MINUTE:
    "এই মুহূর্তে AI লেখার সীমা পূর্ণ হয়েছে। অন্য অনুশীলন চালু আছে।",
  AI_DAILY_QUOTA: "আজ AI অনুশীলনের সীমা শেষ। অন্য অনুশীলন করতে পারবে।",
  AI_PROVIDER_OVERLOAD: "AI সার্ভার ব্যস্ত। অন্য অনুশীলন করতে পারো।",
  USER_SESSION_EXPIRED: "আবার লগইন করলে শেখা চালিয়ে যেতে পারবে।",
};
