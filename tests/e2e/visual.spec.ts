import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { initialProgress } from "../../packages/contracts/api";
test("visual audit of all learning and admin surfaces in both themes", async ({
  page,
  request,
  context,
}, info) => {
  test.setTimeout(180000);
  const id = "learner-two";
  const headers = { "X-Local-User": id, "X-Local-Role": "learner" };
  expect(
    (await (await request.get("http://localhost:8787/api/health")).json())
      .local_demo,
  ).toBe(true);
  await page.addInitScript((id) => {
    localStorage.setItem("engjatra.demo.started", "1");
    localStorage.setItem("engjatra.demo.user", id);
    localStorage.setItem("engjatra.demo.role", "learner");
  }, id);
  let state = {
    ...initialProgress,
    onboarded: true,
    tour: true,
    completed: ["P0-02"],
    words: [
      {
        sense_id: "P0-01:hello",
        en: "hello",
        bn: "হ্যালো",
        unit_id: "P0-01",
        stage: 0,
        due_at: new Date(0).toISOString(),
      },
    ],
  };
  async function checkpoint(step = 0) {
    if (page.url().startsWith("http://localhost:5173"))
      await expect(
        page.getByText("এই ডেমো সেশনে সংরক্ষিত", { exact: true }),
      ).toBeVisible();
    state = { ...state, step };
    const snap = await (
      await request.get("http://localhost:8787/api/learning/snapshot", {
        headers,
      })
    ).json();
    expect(
      (
        await request.post("http://localhost:8787/api/learning/checkpoint", {
          headers,
          data: {
            state,
            expected_revision: snap.revision,
            idempotency_key: crypto.randomUUID(),
          },
        })
      ).ok(),
    ).toBe(true);
  }
  async function capture(name: string) {
    await expect(page.getByRole("heading").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `test-results/visual-${info.project.name}-${name}.png`,
      fullPage: true,
    });
  }
  const widths = info.project.name === "mobile" ? [320, 390] : [768, 1440];
  for (const width of widths)
    for (const theme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await checkpoint();
      await page.goto("/");
      await expect(
        page.getByRole("button", { name: "শেখা চালিয়ে যাও" }),
      ).toBeVisible();
      await capture(`${theme}-${width}-home`);
      await page.getByRole("button", { name: "সেটিংস", exact: true }).click();
      await capture(`${theme}-${width}-settings`);
      await page.keyboard.press("Escape");
      await page
        .getByRole("navigation", { name: "মূল পথ" })
        .getByRole("button", { name: "অগ্রগতি", exact: true })
        .click();
      await capture(`${theme}-${width}-progress`);
      await page
        .getByRole("button", { name: "মনে করে শব্দ অনুশীলন করি" })
        .click();
      await capture(`${theme}-${width}-review`);
      await page
        .getByRole("navigation", { name: "মূল পথ" })
        .getByRole("button", { name: "শেখা", exact: true })
        .click();
      await capture(`${theme}-${width}-path`);
      await page
        .getByRole("button", { name: "ব্যাকরণ ও অনুশীলনের সংগ্রহ" })
        .click();
      await expect(
        page.getByRole("heading", { name: "অনুশীলনের সংগ্রহ" }),
      ).toBeVisible();
      await capture(`${theme}-${width}-grammar`);
      await page.getByRole("button", { name: "শব্দ", exact: true }).click();
      await capture(`${theme}-${width}-word-library`);
      for (const [step, name] of [
        [0, "lesson"],
        [1, "vocabulary"],
        [2, "reading"],
        [3, "quiz"],
        [7, "writing"],
        [11, "tutor"],
      ] as const) {
        await checkpoint(step);
        await page.reload();
        await page.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
        await expect(
          page.getByRole("heading", { name: "হ্যালো বলি" }),
        ).toBeVisible();
        await capture(`${theme}-${width}-${name}`);
      }
      await context.setOffline(true);
      await capture(`${theme}-${width}-offline`);
      await context.setOffline(false);
      await page
        .getByRole("navigation", { name: "মূল পথ" })
        .getByRole("button", { name: "হোম", exact: true })
        .click();
      await page.evaluate(() => {
        const event = new Event("beforeinstallprompt");
        Object.assign(event, {
          prompt: async () => undefined,
          userChoice: Promise.resolve({ outcome: "accepted" }),
        });
        window.dispatchEvent(event);
      });
      await capture(`${theme}-${width}-install`);
    }
  const admin = await context.newPage();
  await admin.addInitScript(() => {
    sessionStorage.setItem("engjatra.admin.started", "yes");
    localStorage.setItem("engjatra.demo.user", "staff");
    localStorage.setItem("engjatra.demo.role", "admin");
  });
  for (const width of widths)
    for (const theme of ["light", "dark"] as const) {
      await admin.setViewportSize({ width, height: 900 });
      await admin.emulateMedia({ colorScheme: theme });
      await admin.goto("http://localhost:5174");
      for (const name of [
        "সারসংক্ষেপ",
        "প্রতিবেদন",
        "সম্পাদনা",
        "প্রকাশ",
        "পরিচালনা",
        "সহায়তা",
      ]) {
        await admin
          .getByRole("navigation")
          .getByRole("button", { name, exact: true })
          .click();
        await expect(
          admin.getByRole("heading", { level: 1, name, exact: true }),
        ).toBeVisible();
        if (name === "সম্পাদনা") {
          await admin
            .getByRole("button", { name: "পাঠ খুলুন", exact: true })
            .click();
          await expect(
            admin.getByRole("heading", { name: "হ্যালো বলি", exact: true }),
          ).toBeVisible();
        }
        expect(
          await admin.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          await admin
            .locator("th")
            .evaluateAll((headers) =>
              headers.every(
                (header) => header.getBoundingClientRect().width >= 80,
              ),
            ),
        ).toBe(true);
        expect(
          (await new AxeBuilder({ page: admin }).analyze()).violations,
        ).toEqual([]);
        await admin.screenshot({
          path: `test-results/visual-admin-${theme}-${width}-${name}.png`,
          fullPage: true,
        });
      }
    }
});
