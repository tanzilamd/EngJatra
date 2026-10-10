import { test, expect } from "@playwright/test";
import { initialProgress } from "../../packages/contracts/api";
import AxeBuilder from "@axe-core/playwright";
test("theme follows the device, persists manual choice and returns to system", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "হালকা", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "ডিভাইস অনুযায়ী" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("engaged install UX, keyboard dialogs and core learning screens work in both themes", async ({
  page,
  request,
}, info) => {
  const id = "learner-two";
  const headers = { "X-Local-User": id, "X-Local-Role": "learner" };
  const snap = await (
    await request.get("http://localhost:8787/api/learning/snapshot", {
      headers,
    })
  ).json();
  await request.post("http://localhost:8787/api/learning/checkpoint", {
    headers,
    data: {
      state: { ...initialProgress, onboarded: true, tour: true },
      expected_revision: snap.revision,
      idempotency_key: crypto.randomUUID(),
    },
  });
  await page.addInitScript((id) => {
    localStorage.setItem("engjatra.demo.started", "1");
    localStorage.setItem("engjatra.demo.user", id);
    localStorage.setItem("engjatra.demo.role", "learner");
    Object.defineProperty(navigator.serviceWorker, "getRegistration", {
      value: async () => ({
        waiting: { postMessage: () => undefined },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });
  }, id);
  await page.goto("/");
  const onboard = page.getByRole("button", {
    name: "একদম নতুন — শূন্য থেকে শুরু",
  });
  if (await onboard.isVisible()) await onboard.click();
  const skip = page.getByRole("button", { name: "এখন বাদ দিই", exact: true });
  if (await skip.isVisible()) await skip.click();
  await expect(
    page.getByRole("button", { name: "শেখা চালিয়ে যাও" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "অ্যাপ ইনস্টল" })).toHaveCount(
    0,
  );
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt");
    Object.assign(event, {
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "পরে করব", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("region", { name: "অ্যাপ ইনস্টল" })).toHaveCount(
    0,
  );
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.getByRole("button", { name: "সেটিংস", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "তোমার পছন্দ" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("group", { name: "রঙের ধরন" })).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("dialog")),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `test-results/settings-${theme}-${info.project.name}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "সেটিংস", exact: true }),
    ).toBeFocused();
    for (const nav of ["হোম", "শেখা", "অগ্রগতি"]) {
      await page
        .getByRole("navigation", { name: "মূল পথ" })
        .getByRole("button", { name: nav, exact: true })
        .click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `test-results/view-${nav}-${theme}-${info.project.name}.png`,
        fullPage: true,
      });
    }
  }
  await page
    .getByRole("navigation", { name: "মূল পথ" })
    .getByRole("button", { name: "হোম", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "আপডেট করো", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
  await expect(page.getByRole("heading", { name: "হ্যালো বলি" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "আপডেট করো", exact: true }),
  ).toBeDisabled();
});

test("safe update surface requires an explicit action and installed sessions suppress install offers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
    Object.defineProperty(navigator.serviceWorker, "getRegistration", {
      value: async () => ({
        waiting: {
          postMessage: (value: unknown) =>
            localStorage.setItem("qa.update-message", JSON.stringify(value)),
        },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "নতুন সংস্করণ প্রস্তুত" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("qa.update-message")),
  ).toBeNull();
  await page.getByRole("button", { name: "আপডেট করো", exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("qa.update-message") || "null"),
    ),
  ).toEqual({ type: "ACTIVATE_UPDATE" });
  await expect(page.getByRole("region", { name: "অ্যাপ ইনস্টল" })).toHaveCount(
    0,
  );
});

test("manual theme works for the current page when preference storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("storage unavailable");
    };
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "গাঢ়", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "গাঢ়", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
