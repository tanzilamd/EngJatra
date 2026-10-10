import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { initialProgress } from "../../packages/contracts/api";
import { normalizeUnit } from "../../scripts/content-tools";
const firstUnit = normalizeUnit(
  JSON.parse(readFileSync("content/units-public/P0/P0-01.json", "utf8")),
);
const reply = {
  assistant_reply_en: "Use go with I.",
  short_explanation_bn: "I-এর পরে go বসে, goes নয়।",
  feedback_type: "clear_error",
  suggested_revision_en: "I go to the market.",
  next_question_en: "What do you buy?",
  learning_tags: ["grammar"],
  source_unit_id: "P0-01",
};
test("tutor acknowledgement, failed-input retry, in-flight protection and bounded contextual chat stay accessible in both themes", async ({
  page,
  request,
}, info) => {
  const headers = { "X-Local-User": "learner", "X-Local-Role": "learner" };
  const snapshot = await (
    await request.get("http://localhost:8787/api/learning/snapshot", {
      headers,
    })
  ).json();
  const seeded = await request.post(
    "http://localhost:8787/api/learning/checkpoint",
    {
      headers,
      data: {
        expected_revision: snapshot.revision,
        idempotency_key: crypto.randomUUID(),
        state: {
          ...initialProgress,
          release: "3.0.1",
          onboarded: true,
          tour: true,
          step: 4 + firstUnit.exercises.length,
        },
      },
    },
  );
  expect(seeded.ok()).toBe(true);
  const sent: Record<string, unknown>[] = [];
  let releaseReply = () => {};
  await page.route("**/api/ai/tutor", async (route) => {
    sent.push(route.request().postDataJSON());
    if (sent.length === 1) return route.abort("failed");
    if (sent.length === 2)
      await new Promise<void>((resolve) => {
        releaseReply = resolve;
      });
    return route.fulfill({ json: { reply } });
  });
  await page.goto("/");
  await expect(page.getByText(/EngJatra শুধু ১৮ বছর/)).toBeVisible();
  await page.getByRole("button", { name: "ডেমোতে শেখা শুরু করি" }).click();
  await page.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
  await page.getByRole("button", { name: "শুরুর একটি বাক্য নিই" }).click();
  await expect(page.getByLabel("তোমার ইংরেজি উত্তর")).not.toHaveValue("");
  await expect(
    page.getByRole("button", { name: "উত্তর পাঠাই", exact: true }),
  ).toBeDisabled();
  expect(sent).toHaveLength(0);
  await page.getByRole("checkbox", { name: /আমার বয়স অন্তত ১৮ বছর/ }).check();
  await page.getByLabel("তোমার ইংরেজি উত্তর").fill("I goes to the market.");
  await page.getByRole("button", { name: "উত্তর পাঠাই", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "আবার পাঠাই", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("তোমার ইংরেজি উত্তর")).toHaveValue(
    "I goes to the market.",
  );
  await page.getByRole("button", { name: "আবার পাঠাই", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "উত্তর আসছে…", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("তোমার ইংরেজি উত্তর")).toHaveJSProperty(
    "readOnly",
    true,
  );
  await expect.poll(() => sent.length).toBe(2);
  releaseReply();
  await expect(
    page.getByText(reply.short_explanation_bn, { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("তোমার ইংরেজি উত্তর")).toHaveValue("");
  await expect(page.getByLabel("তোমার ইংরেজি উত্তর")).toBeFocused();
  await page.getByLabel("তোমার ইংরেজি উত্তর").fill("I buy fruit.");
  await page.getByRole("button", { name: "উত্তর পাঠাই", exact: true }).click();
  await expect.poll(() => sent.length).toBe(3);
  expect(sent[2]).toMatchObject({
    ai_consent: true,
    text: "I buy fruit.",
    context: [
      { role: "user", text: "I goes to the market." },
      { role: "assistant", text: "Use go with I. What do you buy?" },
    ],
  });
  await expect(page.getByLabel("তোমার ইংরেজি উত্তর")).toHaveValue("");
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/tutor-adult-${theme}-${info.project.name}.png`,
      fullPage: true,
    });
  }
});
