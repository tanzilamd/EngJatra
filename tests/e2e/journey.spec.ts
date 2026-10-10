import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { initialProgress } from "../../packages/contracts/api";
const headers = { "X-Local-User": "learner", "X-Local-Role": "learner" };
test.beforeEach(async ({ request }) => {
  const r = await request.get("http://localhost:8787/api/learning/snapshot", {
    headers,
  });
  const snapshot = await r.json();
  await request.post("http://localhost:8787/api/learning/checkpoint", {
    headers,
    data: {
      state: { ...initialProgress },
      expected_revision: snapshot.revision,
      idempotency_key: crypto.randomUUID(),
    },
  });
});
async function start(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ডেমোতে শেখা শুরু করি" }).click();
  await page
    .getByRole("button", { name: "একদম নতুন — শূন্য থেকে শুরু" })
    .click();
  await page.getByRole("button", { name: "এখন বাদ দিই", exact: true }).click();
}
test("beginner finishes a real lesson, writes freely, sees AI fallback, resumes after refresh", async ({
  page,
}) => {
  await start(page);
  await expect(
    page.getByRole("navigation", { name: "মূল পথ" }).getByRole("button"),
  ).toHaveCount(3);
  const access = await new AxeBuilder({ page }).analyze();
  expect(access.violations).toEqual([]);
  await page.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
  await expect(page.getByRole("heading", { name: "হ্যালো বলি" })).toBeVisible();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  await page.getByRole("button", { name: "পরে অনুশীলন করব" }).first().click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  for (const choice of ["I am fine, thank you.", "am", "I am fine."]) {
    await page.getByRole("button", { name: choice, exact: true }).click();
    await page.getByRole("button", { name: "উত্তর যাচাই করি" }).click();
    await expect(page.getByText("সঠিক হয়েছে!", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  }
  for (const token of ["Hello,", "I", "am", "Rina."])
    await page
      .locator(".row")
      .getByRole("button", { name: token, exact: true })
      .click();
  await page.getByRole("button", { name: "উত্তর যাচাই করি" }).click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  await page.getByLabel("তোমার লেখা", { exact: true }).fill("Hi, I am Sami.");
  await page.getByText("উদাহরণ ও নিজের লেখা যাচাই", { exact: true }).click();
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
  await page.getByRole("button", { name: "নিজের লেখা যাচাই করেছি" }).click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  for (const [en, bn] of [
    ["hello", "হ্যালো"],
    ["goodbye", "বিদায়"],
    ["morning", "সকাল"],
    ["fine", "ভালো"],
  ])
    await page
      .getByRole("combobox", { name: en, exact: true })
      .selectOption(bn);
  await page.getByRole("button", { name: "উত্তর যাচাই করি" }).click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  await page
    .getByRole("button", { name: "হ্যালো, আমি রিনা।", exact: true })
    .click();
  await page.getByRole("button", { name: "উত্তর যাচাই করি" }).click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  await page
    .getByRole("button", { name: "I am fine, thank you.", exact: true })
    .click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  await page.getByLabel("তোমার ইংরেজি উত্তর").fill("Hello");
  await page.getByRole("button", { name: "উত্তর পাঠাই" }).click();
  await expect(
    page.getByText(
      "AI অনুশীলন এখন পাওয়া যাচ্ছে না। গল্পের অনুশীলন চালিয়ে যাও।",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "এখন পাঠ শেষ করি" }).click();
  await page.getByRole("button", { name: "পাঠ শেষ করে পথে ফিরি" }).click();
  await expect(
    page.getByText("এই ডেমো সেশনে সংরক্ষিত", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
  await expect(page.getByRole("heading", { name: "নাম জানাই" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("review_status");
});
test("all six tracks, supplemental grammar, readings and mobile layout", async ({
  page,
  request,
}) => {
  await start(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "শেখা", exact: true })
    .click();
  for (const band of ["Pre-A1", "A1", "A2", "B1", "B2", "C1"]) {
    await page.getByRole("button", { name: band, exact: true }).click();
    await expect(page.locator(".unit-link")).toHaveCount(16);
  }
  await page
    .getByRole("button", { name: "ব্যাকরণ ও অনুশীলনের সংগ্রহ" })
    .click();
  await expect(page.getByText("স্তরের অতিরিক্ত ব্যাকরণ").first()).toBeVisible();
  await page.getByRole("button", { name: "দীর্ঘ পাঠ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Interpreting a Survey" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/learn-${test.info().project.name}.png`,
    fullPage: true,
  });
  const manifest = await (await request.get("/content/manifest.json")).json();
  for (const u of manifest.levels.flatMap(
    (l: { units: { id: string }[] }) => l.units,
  )) {
    expect(
      (
        await request.get(`/content/3.0.0/${u.id.split("-")[0]}/${u.id}.json`)
      ).ok(),
    ).toBe(true);
  }
});
test("offline checkpoint remains pending and syncs after connection returns", async ({
  page,
  context,
}) => {
  await start(page);
  await page.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
  await expect(page.getByRole("heading", { name: "হ্যালো বলি" })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  await expect(
    page.getByText("সংরক্ষণ বাকি — সংযোগ ফিরে এলে পাঠানো হবে"),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByText("এই ডেমো সেশনে সংরক্ষিত", { exact: true }),
  ).toBeVisible();
});
test("student report reaches separate protected admin; corrections are drafts until real deployment", async ({
  page,
  context,
  request,
}) => {
  await start(page);
  await page.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
  await page.getByRole("button", { name: "সমস্যা জানাই", exact: true }).click();
  await page
    .getByLabel("কী সমস্যা পেয়েছ?")
    .fill("Please check this translation.");
  await page.route("**/api/reports", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ error: "RATE_LIMIT" }),
    }),
  );
  await page.getByRole("button", { name: "প্রতিবেদন জমা দিই" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "এখন প্রতিবেদন পাঠানোর সীমা পূর্ণ। কিছুক্ষণ পরে আবার চেষ্টা করো।",
  );
  await expect(page.getByLabel("কী সমস্যা পেয়েছ?")).toHaveValue(
    "Please check this translation.",
  );
  await page.unroute("**/api/reports");
  await page.getByRole("button", { name: "প্রতিবেদন জমা দিই" }).click();
  await expect(
    page.getByText("ধন্যবাদ। তোমার প্রতিবেদনটি জমা হয়েছে।"),
  ).toBeVisible();
  await page.getByRole("button", { name: "বন্ধ করি" }).click();
  const admin = await context.newPage();
  await admin.goto("http://localhost:5174");
  await admin.getByRole("button", { name: "স্থানীয় প্রশাসন খুলুন" }).click();
  await admin
    .getByRole("navigation")
    .getByRole("button", { name: "প্রতিবেদন", exact: true })
    .click();
  await expect(
    admin.getByRole("cell", { name: "Please check this translation." }).first(),
  ).toBeVisible();
  await admin
    .getByRole("navigation")
    .getByRole("button", { name: "সম্পাদনা" })
    .click();
  await admin.getByRole("button", { name: "পাঠ খুলুন", exact: true }).click();
  await admin.getByLabel("ব্যক্তিগত সম্পাদকীয় নোট").fill("Private test note");
  await admin.getByRole("button", { name: "খসড়া সংরক্ষণ" }).click();
  await expect(
    admin.getByText("পরিবর্তন সংরক্ষিত হয়েছে। প্রকাশিত সাইট বদলায়নি।"),
  ).toBeVisible();
  const exported = await request.get("http://localhost:8787/api/admin/export", {
    headers: { "X-Local-User": "staff", "X-Local-Role": "admin" },
  });
  expect(await exported.text()).not.toContain("Private test note");
  const forbidden = await request.get(
    "http://localhost:8787/api/admin/overview",
    { headers },
  );
  expect(forbidden.status()).toBe(403);
  const a11y = await new AxeBuilder({ page: admin }).analyze();
  expect(a11y.violations).toEqual([]);
});
