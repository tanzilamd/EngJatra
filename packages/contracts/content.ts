import { z } from "zod";
export const Level = z.enum(["P0", "A1", "A2", "B1", "B2", "C1"]);
export const unitId = z.string().regex(/^(P0|A1|A2|B1|B2|C1)-(0[1-9]|1[0-6])$/);
const text = z.string().min(1).max(12000);
export const Pair = z.object({
  en: text,
  bn: text,
  id: z.string().max(120).optional(),
});
export const Activity = z
  .object({
    id: text,
    type: z.enum([
      "branch_choice",
      "meaning_choice",
      "choice_cloze",
      "detective_choice",
      "word_order",
      "guided_write",
      "guided_writing",
      "vocab_match",
      "reading_meaning_choice",
    ]),
    prompt_bn: text,
    options: z.array(text).optional(),
    correct_index: z.number().int().nonnegative().optional(),
    answer: z.string().optional(),
    accepted_answers: z.array(text).optional(),
    tokens: z.array(text).optional(),
    pairs: z.array(Pair).optional(),
    sentence: z.string().optional(),
    npc_en: z.string().optional(),
    sentence_en: z.string().optional(),
    sample_answer: z.string().optional(),
    rubric_bn: z.array(text).optional(),
    feedback_bn: z.string(),
    auto_graded: z.boolean(),
  })
  .superRefine((a, c) => {
    if (
      a.options &&
      (a.correct_index === undefined ||
        a.correct_index >= a.options.length ||
        new Set(a.options).size !== a.options.length)
    )
      c.addIssue({ code: "custom", message: "Invalid choices" });
    if (a.type === "word_order" && (!a.tokens?.length || !a.answer))
      c.addIssue({ code: "custom", message: "Missing permutation" });
    if (a.type === "vocab_match" && !a.pairs?.length)
      c.addIssue({ code: "custom", message: "Missing pairs" });
    const writing = ["guided_write", "guided_writing"].includes(a.type);
    if (a.auto_graded === writing)
      c.addIssue({
        code: "custom",
        message: "Writing must not be auto graded",
      });
    if (
      !writing &&
      !["word_order", "vocab_match"].includes(a.type) &&
      !a.options?.length
    )
      c.addIssue({ code: "custom", message: "Missing authored options" });
    if (
      a.type === "word_order" &&
      a.tokens?.slice().sort().join(" ") !==
        a.answer?.split(" ").sort().join(" ")
    )
      c.addIssue({ code: "custom", message: "Not a token permutation" });
  });
export const Unit = z
  .object({
    id: unitId,
    level: Level,
    position: z.number().int().min(1).max(16),
    title_bn: text,
    title_en: text,
    goal_bn: text,
    rule_bn: text,
    example_en: text,
    translation_bn: text,
    vocabulary: z.array(Pair),
    reading: z.object({ text_en: text, focus_bn: text }),
    quest: z.object({
      opening_bn: text,
      npc_question_en: text,
      good_response_en: text,
      challenging_response_en: text,
      success_bn: text,
      revision_bn: text,
      follow_up_question_en: z.string().optional(),
      guided_reply_en: z.string().optional(),
    }),
    exercises: z.array(Activity).min(3).max(20),
  })
  .superRefine((u, c) => {
    if (
      u.id.split("-")[0] !== u.level ||
      Number(u.id.split("-")[1]) !== u.position
    )
      c.addIssue({ code: "custom", message: "Stable ID and level mismatch" });
    if (
      new Set(u.exercises.map((a) => a.id)).size !== u.exercises.length ||
      u.exercises.some((a) => !a.id.startsWith(`${u.id}-`))
    )
      c.addIssue({ code: "custom", message: "Invalid activity identity" });
  });
export type UnitData = z.infer<typeof Unit>;
export type ActivityData = z.infer<typeof Activity>;
export type Band = z.infer<typeof Level>;
export const Manifest = z
  .object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    levels: z.array(
      z.object({
        id: Level,
        name_bn: text,
        goal: text,
        units: z.array(
          z.object({
            id: unitId,
            title_bn: text,
            goal_bn: text,
            sha256: z.string().length(64),
          }),
        ),
      }),
    ),
  })
  .superRefine((m, c) => {
    if (
      m.levels.length !== 6 ||
      new Set(m.levels.map((l) => l.id)).size !== 6 ||
      m.levels.some(
        (l) =>
          l.units.length !== 16 ||
          new Set(l.units.map((u) => u.id)).size !== 16 ||
          l.units.some((u) => !u.id.startsWith(`${l.id}-`)),
      )
    )
      c.addIssue({ code: "custom", message: "Incomplete curriculum" });
  });
export type ManifestData = z.infer<typeof Manifest>;
export const Grammar = z.object({
  id: text,
  level: Level,
  unit_id: unitId.optional(),
  title_en: text,
  rule_bn: text,
  example_en: text,
  example_bn: text.optional(),
  caveat_bn: text,
});
export const Vocabulary = z.object({
  id: text,
  en: text,
  bn: text,
  units: z.array(unitId),
  learning_level_suggested: Level,
  english_example: z.string().nullable(),
});
export const Reading = z.object({
  id: text,
  level: Level,
  title_en: text,
  text_en: text,
  question_en: text,
  options: z.array(text),
  correct_index: z.number().int().nonnegative(),
  answer_explanation_bn: text,
});
export const Conversation = z.object({
  id: text,
  unit_id: unitId,
  level: Level,
  scene_bn: text,
  turns: z.array(
    z.object({ role: z.enum(["npc", "learner_sample"]), text_en: text }),
  ),
  learning_focus_bn: text,
});
export const CheckpointQuiz = z.object({
  id: text,
  level: Level,
  items: z.array(
    z.object({
      item_id: text,
      question: text,
      options: z.array(text),
      correct_index: z.number().int().nonnegative(),
      feedback_bn: text,
    }),
  ),
});
export const Library = z.object({
  grammar: z.array(Grammar),
  vocabulary: z.array(Vocabulary),
  readings: z.array(Reading),
  conversations: z.array(Conversation),
  checkpoint: CheckpointQuiz,
  resources: z.array(
    z.object({ skill: z.string(), name: text, url: z.string().url() }),
  ),
});
export type LibraryData = z.infer<typeof Library>;
