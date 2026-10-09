import type { ActivityData, Band } from "../contracts/content";
import type { Progress } from "../contracts/api";
export const bands: Band[] = ["P0", "A1", "A2", "B1", "B2", "C1"];
export const normalize = (s: string) =>
  s.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
export function score(
  a: ActivityData,
  answer: number | string | Record<string, string>,
): boolean | null {
  if (!a.auto_graded) return null;
  if (a.options)
    return typeof answer === "number" && answer === a.correct_index;
  if (a.type === "word_order")
    return (
      typeof answer === "string" &&
      [a.answer, ...(a.accepted_answers ?? [])].some(
        (v) => v !== undefined && normalize(v) === normalize(answer),
      )
    );
  if (a.type === "vocab_match")
    return (
      typeof answer === "object" &&
      !!a.pairs?.every((p) => answer[p.en] === p.bn)
    );
  return false;
}
export function nextUnit(id: string) {
  const [band, n] = id.split("-");
  const index = bands.indexOf(band as Band);
  return Number(n) < 16
    ? `${band}-${String(Number(n) + 1).padStart(2, "0")}`
    : index < 5
      ? `${bands[index + 1]}-01`
      : id;
}
export function review(stage: number, correct: boolean, now = Date.now()) {
  const next = correct ? Math.min(stage + 1, 4) : 0;
  return {
    stage: next,
    due_at: new Date(now + [1, 1, 3, 7, 14][next] * 86400000).toISOString(),
  };
}
export function mergeProgress(server: Progress, local: Progress): Progress {
  return {
    ...local,
    attempts: [
      ...new Map(
        [...server.attempts, ...local.attempts].map((a) => [a.id, a]),
      ).values(),
    ].slice(-300),
    completed: [...new Set([...server.completed, ...local.completed])],
    words: [
      ...new Map(
        [...server.words, ...local.words].map((w) => [w.sense_id, w]),
      ).values(),
    ],
    mistakes: [
      ...new Map(
        [...server.mistakes, ...local.mistakes].map((m) => [m.activity_id, m]),
      ).values(),
    ].slice(-300),
  };
}
export function canComplete(
  total: number,
  done: Set<string>,
  activities: ActivityData[],
) {
  return total === activities.length && activities.every((a) => done.has(a.id));
}
