import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect, chromium } from "@playwright/test";
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
    page
      .getByText("অ্যাকাউন্ট সংযোগ এখনো প্রস্তুত হয়নি। পরে আবার এসো।")
      .or(page.getByRole("button", { name: "লগইন", exact: true })),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ডেমোতে শেখা শুরু করি" }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("http://localhost:5176");
  await expect(
    page
      .getByText("অ্যাকাউন্ট সংযোগ এখনো প্রস্তুত হয়নি। পরে আবার এসো।")
      .or(page.getByRole("button", { name: "লগইন", exact: true })),
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
        const c = await caches.open("engjatra-public-content-v2");
        return !!(await c.match("/content/3.0.0/P0/P0-01.json"));
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "আবার স্বাগতম" }),
  ).toBeVisible();
  const value = await page.evaluate(async () => {
    const r = await fetch("/content/3.0.0/P0/P0-01.json");
    return (await r.json()).id;
  });
  expect(value).toBe("P0-01");
  const privateCaches = await page.evaluate(async () => {
    const c = await caches.open("engjatra-public-content-v2");
    return (await c.keys()).some((r) =>
      new URL(r.url).pathname.startsWith("/api/"),
    );
  });
  expect(privateCaches).toBe(false);
  await context.setOffline(false);
});

test("PWA manifest, icons, installability and all caches exclude private/authentication requests", async ({
  page,
  request,
}) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "bn",
  });
  expect(
    manifest.icons.some(
      (icon: { purpose: string }) => icon.purpose === "maskable",
    ),
  ).toBe(true);
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  // Real installability checks require a normal profile; incognito intentionally
  // disables installation. Do not suppress that browser restriction.
  const profile = await mkdtemp(join(tmpdir(), "engjatra-pwa-"));
  const normal = await chromium.launchPersistentContext(profile, {
    executablePath:
      process.env.CHROMIUM_PATH === ""
        ? undefined
        : (process.env.CHROMIUM_PATH ?? "/usr/bin/chromium"),
    args: ["--no-sandbox"],
  });
  try {
    const installPage = await normal.newPage();
    await installPage.goto("http://localhost:5175");
    await installPage.evaluate(() => navigator.serviceWorker.ready);
    const session = await normal.newCDPSession(installPage);
    await session.send("Page.enable");
    expect(
      (await session.send("Page.getInstallabilityErrors")).installabilityErrors,
    ).toEqual([]);
  } finally {
    await normal.close();
    await rm(profile, { recursive: true, force: true });
  }
  await page.evaluate(async () => {
    await Promise.allSettled([
      fetch("/api/learning/snapshot"),
      fetch("/?code=private-auth-code"),
      fetch("/content/manifest.json?access_token=private-value"),
    ]);
  });
  const privateFiles = await page.evaluate(async () => {
    const keys = await Promise.all(
      (await caches.keys()).map(async (key) => (await caches.open(key)).keys()),
    );
    return keys
      .flat()
      .filter((request) => {
        const url = new URL(request.url);
        return url.pathname.startsWith("/api") || !!url.search;
      })
      .map((request) => request.url);
  });
  expect(privateFiles).toEqual([]);
});
