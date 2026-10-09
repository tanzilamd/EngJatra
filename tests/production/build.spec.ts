import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("production rejects browser demo flags on both apps; missing auth fails closed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("engjatra.demo.started", "1");
    localStorage.setItem("engjatra.demo.role", "owner");
    sessionStorage.setItem("engjatra.admin.started", "yes");
  });
  await page.goto("/");
  await expect(
    page.getByText("অ্যাকাউন্ট সংযোগ এখনো প্রস্তুত হয়নি। পরে আবার এসো।"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ডেমোতে শেখা শুরু করি" }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("http://localhost:5176");
  await expect(
    page.getByText("অ্যাকাউন্ট সংযোগ এখনো প্রস্তুত হয়নি। পরে আবার এসো।"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "স্থানীয় প্রশাসন খুলুন" }),
  ).toHaveCount(0);
});
test("public caching survives offline reload and never stores API responses", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.evaluate(async () => {
    await fetch("/content/3.0.0/P0/P0-01.json");
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const c = await caches.open("engjatra-public-v1");
        return !!(await c.match("/content/3.0.0/P0/P0-01.json"));
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "সহজ ধাপে, নিজের গতিতে ইংরেজি শিখুন।" }),
  ).toBeVisible();
  const value = await page.evaluate(async () => {
    const r = await fetch("/content/3.0.0/P0/P0-01.json");
    return (await r.json()).id;
  });
  expect(value).toBe("P0-01");
  const privateCaches = await page.evaluate(async () => {
    const c = await caches.open("engjatra-public-v1");
    return (await c.keys()).some((r) =>
      new URL(r.url).pathname.startsWith("/api/"),
    );
  });
  expect(privateCaches).toBe(false);
  await context.setOffline(false);
});
