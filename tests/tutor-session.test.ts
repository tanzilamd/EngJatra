import { it, expect } from "vitest";
import {
  encodeTutorSession,
  decodeTutorSession,
} from "../packages/data/tutor-session";
const one = {
  id: "11111111-1111-4111-8111-111111111111",
  unit_id: "P0-01",
  release: "3.0.13",
  mode: "conversation" as const,
  title: "A pending practice",
  created_at: "2026-10-10T00:00:00Z",
  messages: [],
  draft: "An unsent practice sentence.",
  busy: true,
};
it("opted-in session recovery preserves older selection and in-flight draft without credentials or inferred consent", () => {
  const raw = encodeTutorSession(one.id, [
    { ...one, consent: true, token: "never-retain-this-fixture" },
    { ...one, id: crypto.randomUUID(), busy: false },
  ] as (typeof one)[]);
  const recovered = decodeTutorSession(raw);
  expect(recovered.selected).toBe(one.id);
  expect(recovered.chats[0]).toMatchObject({
    draft: one.draft,
    interrupted: true,
  });
  expect(raw).not.toContain("consent");
  expect(raw).not.toContain("never-retain-this-fixture");
});
it("bounded cache parsing rejects corrupt, foreign contract and oversized data", () => {
  for (const raw of [
    "broken",
    JSON.stringify({
      selected: one.id,
      chats: [{ ...one, unit_id: "unknown" }],
    }),
    "x".repeat(500001),
  ])
    expect(() => decodeTutorSession(raw)).toThrow();
});
