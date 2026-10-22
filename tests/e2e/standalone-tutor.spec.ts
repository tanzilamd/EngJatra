import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { validateProductionTutor } from "../../scripts/live-ai-result";
import { initialProgress, messages } from "../../packages/contracts/api";
async function start(
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext,
) {
  const headers = { "X-Local-User": "learner", "X-Local-Role": "learner" };
  const snapshot = await (
    await request.get("http://localhost:8787/api/learning/snapshot", {
      headers,
    })
  ).json();
  expect(
    (
      await request.post("http://localhost:8787/api/learning/checkpoint", {
        headers,
        data: {
          expected_revision: snapshot.revision,
          idempotency_key: crypto.randomUUID(),
          state: {
            ...initialProgress,
            onboarded: true,
            tour: true,
            release: "3.0.13",
          },
        },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/");
  await page.getByRole("button", { name: "ডেমোতে শেখা শুরু করি" }).click();
  await page
    .getByRole("navigation", { name: "মূল পথ" })
    .getByRole("button", { name: "AI টিউটর", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "চলো, ইংরেজিতে কথা বলি!" }),
  ).toBeVisible();
}
const fixture = (id: string, valid = false) => ({
  assistant_reply_en: valid ? "Fruit is a useful word." : "Use go with I.",
  short_explanation_bn: valid
    ? "বাক্যটি ঠিক আছে। fruit মানে ফল।"
    : "এই বাক্যে I-এর সঙ্গে go বসে।",
  feedback_type: valid ? "none" : "clear_error",
  suggested_revision_en: valid ? null : "I go to the market.",
  next_question_en: "What does the fictional shopper buy next?",
  learning_tags: ["grammar"],
  source_unit_id: id,
});
test("standalone chat navigation, opt-in refresh, draft retry, context and confirmed deletion", async ({
  page,
  request,
}, info) => {
  let attempts = 0;
  const sent: Record<string, unknown>[] = [];
  await page.route("**/api/ai/tutor", async (route) => {
    attempts++;
    const data = route.request().postDataJSON();
    sent.push(data);
    if (attempts === 1) return route.abort();
    return route.fulfill({
      json: {
        reply: fixture(data.unit_id, attempts > 2),
        history_status: "unavailable",
      },
    });
  });
  await start(page, request);
  expect(
    await page
      .getByRole("navigation", { name: "মূল পথ" })
      .getByRole("button")
      .count(),
  ).toBe(4);
  await page
    .getByRole("button", { name: "আমার বাক্য ঠিক করে দাও", exact: true })
    .click();
  await expect(page.getByLabel("তোমার ইংরেজি উত্তর")).toHaveValue(/I goes/);
  await expect(
    page.getByRole("button", { name: "উত্তর পাঠাই", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: /আমি প্রাপ্তবয়স্ক/ }).check();
  await page.getByRole("button", { name: "উত্তর পাঠাই", exact: true }).click();
  await expect(page.getByRole("button", { name: "আবার পাঠাই" })).toBeVisible();
  expect(await page.getByLabel("তোমার ইংরেজি উত্তর").inputValue()).toContain(
    "I goes",
  );
  await page.getByRole("button", { name: "আবার পাঠাই" }).click();
  await expect(
    page.getByText("এই বাক্যে I-এর সঙ্গে go বসে।", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("তোমার ইংরেজি উত্তর").fill("I buy fruit.");
  await page.getByRole("button", { name: "উত্তর পাঠাই", exact: true }).click();
  await expect.poll(() => sent.length).toBe(3);
  expect(sent[2]).toMatchObject({ mode: "conversation", ai_consent: true });
  expect((sent[2].context as unknown[]).length).toBe(2);
  await page
    .getByRole("navigation", { name: "মূল পথ" })
    .getByRole("button", { name: "হোম", exact: true })
    .click();
  await page.goBack();
  await expect(page.getByText("I buy fruit.", { exact: true })).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `test-results/standalone-active-${theme}-${info.project.name}.png`,
      fullPage: true,
    });
  }
  const historyButton = page.getByRole("button", { name: "আলাপ", exact: true });
  if (await historyButton.isVisible()) await historyButton.click();
  await page.screenshot({
    path: `test-results/standalone-drawer-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("checkbox", { name: "AI লেখার ইতিহাস রাখব", exact: true })
    .check();
  if (await page.getByRole("dialog", { name: "তোমার আলাপ" }).isVisible())
    await page.getByRole("button", { name: "বন্ধ করি", exact: true }).click();
  await page.reload();
  await expect(page.getByText("I buy fruit.", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /আমি প্রাপ্তবয়স্ক/ }),
  ).not.toBeChecked();
  if (await historyButton.isVisible()) await historyButton.click();
  await page
    .getByRole("button", { name: "নতুন আলাপ শুরু করি", exact: true })
    .click();
  if (await historyButton.isVisible()) await historyButton.click();
  await page
    .getByRole("button", { name: /^Help me correct this English/ })
    .click();
  await page
    .getByRole("navigation", { name: "মূল পথ" })
    .getByRole("button", { name: "হোম", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "মূল পথ" })
    .getByRole("button", { name: "AI টিউটর", exact: true })
    .click();
  await page.reload();
  await expect(page.getByText("I buy fruit.", { exact: true })).toBeVisible();
  if (await historyButton.isVisible()) await historyButton.click();
  await expect(
    page
      .getByRole("dialog", { name: "তোমার আলাপ" })
      .getByRole("heading", { name: "তোমার আলাপ", exact: true }),
  ).toHaveCount((await historyButton.isVisible()) ? 1 : 0);
  await page.getByRole("button", { name: "সব আলাপ মুছি", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "সব আলাপ মুছে ফেলবে?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "এখন থাক", exact: true }).click();
  await expect(page.getByText("I buy fruit.", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "সব আলাপ মুছি", exact: true }).click();
  await page
    .getByRole("button", { name: "আলাপ মুছে ফেলি", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "তোমার আলাপ" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "চলো, ইংরেজিতে কথা বলি!" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/tutor-history-${info.project.name}.png`,
    fullPage: true,
  });
});
test("lesson-linked route preserves progress and both themes wrap at all target widths", async ({
  page,
  request,
}, info) => {
  await start(page, request);
  await page
    .getByRole("navigation", { name: "মূল পথ" })
    .getByRole("button", { name: "হোম", exact: true })
    .click();
  await page
    .getByRole("button", { name: "শেখা চালিয়ে যাও", exact: true })
    .click();
  await page
    .getByRole("button", { name: "এই পাঠ নিয়ে AI অনুশীলন", exact: true })
    .click();
  await expect(page).toHaveURL(
    /\/tutor\?unit=P0-01&release=3\.0\.0|\/tutor\?unit=P0-01&release=3\.0\.13/,
  );
  await expect(
    page.getByRole("heading", { name: "এই পাঠ নিয়ে কথা বলি", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "পাঠের শব্দ দিয়ে কথা বলি", exact: true })
    .click();
  await expect(page.getByLabel("তোমার ইংরেজি উত্তর")).toHaveValue(
    "Help me practise the vocabulary from this lesson.",
  );
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/standalone-${theme}-${width}-${info.project.name}.png`,
        fullPage: true,
      });
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "এই পাঠ নিয়ে কথা বলি", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "হ্যালো বলি", exact: true }),
  ).toBeVisible();
});
test("missing private deep link recovers, no opt-out transcript cache, safe offline composer and new chat modes", async ({
  page,
  request,
}) => {
  await start(page, request);
  await page.goto("/tutor?chat=11111111-1111-4111-8111-111111111111");
  await expect(page.getByText(/এই আলাপ পাওয়া যায়নি/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "চলো, ইংরেজিতে কথা বলি!" }),
  ).toBeVisible();
  await page.getByLabel("তোমার ইংরেজি উত্তর").fill("An unsent draft.");
  expect(
    await page.evaluate(
      () =>
        Object.keys(sessionStorage).filter((k) =>
          k.startsWith("engjatra.chat.tab."),
        ).length,
    ),
  ).toBe(0);
  await page.context().setOffline(true);
  await expect(page.getByText(/AI-এর জন্য ইন্টারনেট দরকার/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "উত্তর পাঠাই", exact: true }),
  ).toBeDisabled();
  await page.context().setOffline(false);
  await expect(page.getByLabel("তোমার ইংরেজি উত্তর")).toHaveValue(
    "An unsent draft.",
  );
  await page
    .getByRole("button", { name: "পাঠের অনুশীলন", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "এই পাঠ নিয়ে কথা বলি", exact: true }),
  ).toBeVisible();
});

test("cloud-history contracts switch and delete safely; long chat does not steal scroll and composer blocks duplicates", async ({
  page,
  request,
}, info) => {
  const id = "44444444-4444-4444-8444-444444444444";
  const header = {
    id,
    unit_id: "P0-01",
    release: "3.0.13",
    mode: "conversation",
    title: "আগের কথোপকথন",
    created_at: "2026-10-10T00:00:00Z",
  };
  const messages = Array.from({ length: 40 }, (_, i) => ({
    id: crypto.randomUUID(),
    role: i % 2 ? "assistant" : "user",
    content:
      i % 2
        ? "A fictional shopper buys fruit. This is a practice example."
        : "I buy fruit.",
    reply: null,
  }));
  let deleted = false,
    resolve = () => {},
    calls = 0;
  await page.route("**/api/chat/history?*", (route) =>
    route.fulfill({
      json: { available: true, threads: deleted ? [] : [header] },
    }),
  );
  await page.route(`**/api/chat/history/${id}`, (route) => {
    if (route.request().method() === "DELETE") {
      deleted = true;
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: { ...header, messages } });
  });
  await page.route("**/api/ai/tutor", async (route) => {
    calls++;
    await new Promise<void>((r) => {
      resolve = r;
    });
    return route.fulfill({
      json: {
        reply: fixture("P0-01", true),
        history_status: "saved",
        conversation_id: id,
      },
    });
  });
  await start(page, request);
  const open = page.getByRole("button", { name: "আলাপ", exact: true });
  if (await open.isVisible()) await open.click();
  await page.getByRole("checkbox", { name: "AI লেখার ইতিহাস রাখব" }).check();
  await page.getByRole("button", { name: /আগের কথোপকথন.*কথোপকথন/ }).click();
  await expect(page).toHaveURL(new RegExp(`/tutor\\?chat=${id}`));
  await expect(page.getByRole("log").locator("article")).toHaveCount(40);
  await page.getByRole("checkbox", { name: /আমি প্রাপ্তবয়স্ক/ }).check();
  const input = page.getByLabel("তোমার ইংরেজি উত্তর");
  await input.fill("I buy fruit.");
  await input.press("Shift+Enter");
  await expect(input).toHaveValue("I buy fruit.\n");
  await input.fill("I buy fruit.");
  await page.getByRole("button", { name: "উত্তর পাঠাই", exact: true }).click();
  await expect.poll(() => calls).toBe(1);
  await expect(input).toHaveJSProperty("readOnly", true);
  await page.getByRole("log").evaluate((e) => {
    e.scrollTop = 0;
    e.dispatchEvent(new Event("scroll"));
  });
  resolve();
  await expect(page.getByRole("log").locator("article")).toHaveCount(42);
  expect(await page.getByRole("log").evaluate((e) => e.scrollTop)).toBeLessThan(
    100,
  );
  expect(calls).toBe(1);
  await page.screenshot({
    path: `test-results/standalone-long-${info.project.name}.png`,
    fullPage: true,
  });
  if (await open.isVisible()) await open.click();
  await page
    .getByRole("button", { name: "আলাপ মুছি: আগের কথোপকথন", exact: true })
    .click();
  await page
    .getByRole("button", { name: "আলাপ মুছে ফেলি", exact: true })
    .click();
  await expect.poll(() => deleted).toBe(true);
});

test("cloud link promotion, unsaved continuation and immediate history opt-out retain local context", async ({
  page,
  request,
}) => {
  const id = "55555555-5555-4555-8555-555555555555";
  const nextId = "66666666-6666-4666-8666-666666666666";
  await page.route("**/api/chat/history?*", (route) =>
    route.fulfill({ json: { available: true, threads: [] } }),
  );
  const sent: Record<string, unknown>[] = [];
  await page.route("**/api/ai/tutor", (route) => {
    sent.push(route.request().postDataJSON());
    const status =
      sent.length === 2
        ? "unavailable"
        : sent.length === 4
          ? "disabled"
          : "saved";
    return route.fulfill({
      json: {
        reply: fixture("P0-01", true),
        history_status: status,
        conversation_id:
          status === "saved" ? (sent.length === 1 ? id : nextId) : null,
      },
    });
  });
  await start(page, request);
  const open = page.getByRole("button", { name: "আলাপ", exact: true });
  if (await open.isVisible()) await open.click();
  await page.getByRole("checkbox", { name: "AI লেখার ইতিহাস রাখব" }).check();
  if (await page.getByRole("dialog").isVisible())
    await page.getByRole("button", { name: "বন্ধ করি", exact: true }).click();
  await page.getByRole("checkbox", { name: /আমি প্রাপ্তবয়স্ক/ }).check();
  const input = page.getByLabel("তোমার ইংরেজি উত্তর");
  const send = page.getByRole("button", { name: "উত্তর পাঠাই", exact: true });
  await input.fill("I buy apples.");
  await send.click();
  await expect(page.getByRole("log").locator("article")).toHaveCount(2);
  expect(sent[0]).toMatchObject({ history_opt_in: true });
  expect(sent[0]).not.toHaveProperty("conversation_id");
  await expect(page).toHaveURL(new RegExp(`chat=${id}`));
  await input.fill("I buy bananas.");
  await send.click();
  await expect(page.getByRole("log").locator("article")).toHaveCount(4);
  expect(sent[1]).toMatchObject({ conversation_id: id, history_opt_in: true });
  await input.fill("I buy bread.");
  await send.click();
  await expect(page.getByRole("log").locator("article")).toHaveCount(6);
  expect(sent[2]).not.toHaveProperty("conversation_id");
  expect(sent[2].context).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ role: "user", text: "I buy bananas." }),
    ]),
  );
  await expect(page).toHaveURL(new RegExp(`chat=${nextId}`));
  if (await open.isVisible()) await open.click();
  await page.getByRole("checkbox", { name: "AI লেখার ইতিহাস রাখব" }).uncheck();
  if (await page.getByRole("dialog").isVisible())
    await page.getByRole("button", { name: "বন্ধ করি", exact: true }).click();
  await input.fill("I buy grapes.");
  await send.click();
  await expect(page.getByRole("log").locator("article")).toHaveCount(8);
  expect(sent[3]).toMatchObject({ history_opt_in: false });
  expect(sent[3]).not.toHaveProperty("conversation_id");
  expect(sent[3].context).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ role: "user", text: "I buy bread." }),
    ]),
  );
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((k) =>
        k.startsWith("engjatra.chat.tab."),
      ),
    ),
  ).toBe(false);
  await expect(page).toHaveURL(new RegExp(`chat=${nextId}`));
});

test("switching saved threads and browser history never promotes the previous chat over a pending deep link", async ({
  page,
  request,
}) => {
  const ids = [
    "88888888-8888-4888-8888-888888888888",
    "99999999-9999-4999-8999-999999999999",
  ];
  const headers = ids.map((id, i) => ({
    id,
    unit_id: "P0-01",
    release: "3.0.13",
    mode: "conversation",
    title: i ? "দ্বিতীয় আলাপ" : "প্রথম আলাপ",
    created_at: "2026-10-10T00:00:00Z",
  }));
  await page.route("**/api/chat/history?*", (route) =>
    route.fulfill({ json: { available: true, threads: headers } }),
  );
  for (const [i, id] of ids.entries())
    await page.route(`**/api/chat/history/${id}`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return route.fulfill({
        json: {
          ...headers[i],
          messages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              content: i ? "Second saved practice." : "First saved practice.",
            },
          ],
        },
      });
    });
  await start(page, request);
  const open = page.getByRole("button", { name: "আলাপ", exact: true });
  if (await open.isVisible()) await open.click();
  await page.getByRole("button", { name: /প্রথম আলাপ.*কথোপকথন/ }).click();
  await expect(
    page.getByRole("log").getByText("First saved practice.", { exact: true }),
  ).toBeVisible();
  if (await open.isVisible()) await open.click();
  await page.getByRole("button", { name: /দ্বিতীয় আলাপ.*কথোপকথন/ }).click();
  await expect(
    page.getByRole("log").getByText("Second saved practice.", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`chat=${ids[1]}`));
  await expect(
    page.getByRole("log").getByText("First saved practice.", { exact: true }),
  ).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`chat=${ids[0]}`));
  await expect(
    page.getByRole("log").getByText("First saved practice.", { exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`chat=${ids[1]}`));
  await expect(
    page.getByRole("log").getByText("Second saved practice.", { exact: true }),
  ).toBeVisible();
});

test("regional denial remains an exact accessible message with authored continuation and no fake inference", async ({
  page,
  request,
}) => {
  await start(page, request);
  const unit = await (
    await request.get("http://localhost:5173/content/3.0.13/P0/P0-01.json")
  ).json();
  const denied = {
    error: "AI_REGION_UNAVAILABLE",
    fallback_activity: unit.exercises[0].id,
    country: "US",
  };
  await page.route("**/api/ai/tutor", (route) =>
    route.fulfill({ json: denied }),
  );
  await page.getByRole("checkbox", { name: /আমি প্রাপ্তবয়স্ক/ }).check();
  const input = page.getByLabel("তোমার ইংরেজি উত্তর");
  await input.fill("I goes to the market.");
  const received = page.waitForResponse(
    (r) => r.url().endsWith("/api/ai/tutor") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "উত্তর পাঠাই", exact: true }).click();
  const result = validateProductionTutor(await (await received).json(), "BD");
  expect(result).toMatchObject({
    inference_verified: false,
    regional_denial_verified: true,
    country: "US",
  });
  await expect(
    page.getByText(messages.AI_REGION_UNAVAILABLE, { exact: true }),
  ).toBeVisible();
  await expect(input).toHaveValue("I goes to the market.");
  await expect(page.getByRole("log").locator("article")).toHaveCount(0);
  await page
    .getByRole("button", { name: "AI ছাড়া শেখা চালিয়ে যাই", exact: true })
    .click();
  await expect(page).toHaveURL(/\/learn$/);
});
