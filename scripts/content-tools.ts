import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Unit, Activity } from "../packages/contracts/content";
export const forbidden =
  /^(publication_status|content_status|human_review.*|review_status|review_state|internal_notes|admin_notes|expert_verified|approval_status|teacher_review|verified_at|reviewer|cefr.*verified|needs_human_editorial_review|human_expert_review_completed|.*secret.*|.*api_key.*|.*access_token.*)$/i;
export function scan(value: unknown, path = "root"): void {
  if (Array.isArray(value)) value.forEach((v, i) => scan(v, `${path}.${i}`));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      if (forbidden.test(k)) throw Error(`Private field ${path}.${k}`);
      scan(v, `${path}.${k}`);
    }
}
export const readJson = async (p: string): Promise<unknown> =>
  JSON.parse(await readFile(p, "utf8"));
export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export function normalizeUnit(raw: unknown) {
  scan(raw);
  const u = raw as Record<string, unknown>;
  const q = u.quest as Record<string, unknown>;
  const continuation = q.scripted_continuation as
    Record<string, unknown> | undefined;
  return Unit.parse({
    ...u,
    quest: { ...q, ...continuation },
    exercises: (u.exercises as Record<string, unknown>[]).map((e) =>
      Activity.parse({
        ...e,
        options: e.options ?? e.options_bn,
        sentence_en: e.sentence_en,
        sample_answer: e.sample_answer ?? e.sample_answer_en,
        rubric_bn: e.rubric_bn ??
          e.review_steps_bn ?? [
            "চাওয়া তথ্য লিখেছ কি?",
            "অর্থ ও বাক্য গঠন মিলিয়ে দেখো।",
            "অন্য সঠিকভাবে বলা যায় কি?",
          ],
        feedback_bn: e.feedback_bn ?? u.rule_bn,
      }),
    ),
  });
}
