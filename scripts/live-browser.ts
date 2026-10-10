import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import { settings } from "./deployment-config";
import { redactLog } from "./redact-log";
import { liveBrowserOptions } from "./live-browser-options";

// Actual public origins only: no request interception, mocks or demo adapters.
const config = settings({
  ...process.env,
  GEMMA_FREE_CONFIRMED: "false",
  LLAMA_FREE_CONFIRMED: "false",
});
const browser = await chromium.launch(liveBrowserOptions());
const results: {
  service: string;
  width: number;
  theme: string;
  checks: string[];
}[] = [];
try {
  for (const [service, origin] of [
    ["student", config.student],
    ["admin", config.admin],
  ]) {
    for (const width of [1280, 320])
      for (const theme of ["light", "dark"] as const) {
        const context = await browser.newContext({
          viewport: { width, height: 800 },
          colorScheme: theme,
        });
        try {
          const page = await context.newPage();
          const errors: string[] = [];
          page.on("pageerror", () => errors.push("uncaught browser error"));
          page.on("response", (response) => {
            if (response.status() >= 400)
              errors.push(`resource HTTP ${response.status()}`);
          });
          const response = await page.goto(origin, {
            waitUntil: "networkidle",
            timeout: 45000,
          });
          if (!response?.ok()) throw Error(`${service}: homepage did not load`);
          await page
            .getByRole("heading", {
              name: service === "student" ? "আবার স্বাগতম" : "প্রশাসনে স্বাগতম",
            })
            .waitFor();
          await page.getByLabel("ইমেইল", { exact: true }).waitFor();
          await page.getByLabel("পাসওয়ার্ড", { exact: true }).waitFor();
          const style = await page.evaluate(async () => {
            await document.fonts.ready;
            return {
              fonts: document.fonts.check('16px "Hind Siliguri"'),
              fit: document.documentElement.scrollWidth <= innerWidth,
              images: [...document.images].every(
                (image) => image.complete && image.naturalWidth > 0,
              ),
              buttons: getComputedStyle(document.querySelector(".auth-submit")!)
                .backgroundColor,
              theme: document.documentElement.dataset.theme,
            };
          });
          if (
            !style.fonts ||
            !style.fit ||
            !style.images ||
            style.theme !== theme ||
            style.buttons === "rgba(0, 0, 0, 0)"
          )
            throw Error(
              `${service}: font, branding, CSS or mobile layout failed`,
            );
          const accessibility = await new AxeBuilder({ page }).analyze();
          if (accessibility.violations.length)
            throw Error(
              `${service}: ${accessibility.violations.length} accessibility violations`,
            );
          if (service === "student") {
            await page
              .getByRole("button", { name: "অ্যাকাউন্ট তৈরি করো", exact: true })
              .click();
            await page
              .getByRole("button", { name: "অ্যাকাউন্ট তৈরি করো", exact: true })
              .waitFor();
          }
          if (service === "student")
            await page
              .getByRole("button", { name: "লগইন করো", exact: true })
              .click();
          await page
            .getByRole("button", { name: "পাসওয়ার্ড ভুলে গেছি", exact: true })
            .click();
          await page
            .getByRole("button", { name: "লিংক পাঠাও", exact: true })
            .waitFor();
          await page.goto(`${origin}/learn`, { waitUntil: "networkidle" });
          await page.getByLabel("ইমেইল", { exact: true }).waitFor();
          await page.reload({ waitUntil: "networkidle" });
          if (errors.length) throw Error(`${service}: ${errors.join(", ")}`);
          results.push({
            service,
            width,
            theme,
            checks: [
              "real HTML/JS/CSS/fonts/branding/Bangla",
              "responsive layout",
              "axe accessibility",
              "Auth and recovery UI",
              "SPA refresh",
              "no uncaught JS or HTTP resource errors",
            ],
          });
        } finally {
          await context.close();
        }
      }
  }
  const profile = await mkdtemp(join(tmpdir(), "engjatra-live-pwa-"));
  const normal = await chromium.launchPersistentContext(
    profile,
    liveBrowserOptions(),
  );
  try {
    const page = await normal.newPage();
    await page.goto(config.student, { waitUntil: "networkidle" });
    await page.evaluate(() => navigator.serviceWorker.ready);
    const session = await normal.newCDPSession(page);
    await session.send("Page.enable");
    const installability = (await session.send("Page.getInstallabilityErrors"))
      .installabilityErrors;
    if (installability.length)
      throw Error(
        `Student PWA installability: ${installability.map((error) => error.errorId).join(", ")}`,
      );
    results.push({
      service: "student",
      width: 1280,
      theme: "system",
      checks: [
        "real manifest/icons/service-worker installability in a normal browser profile",
      ],
    });
  } finally {
    await normal.close();
    await rm(profile, { recursive: true, force: true });
  }
  await mkdir(".wrangler", { recursive: true });
  const report = {
    verified_at: new Date().toISOString(),
    results,
    not_tested: [
      "real email delivery/confirmation",
      "Google OAuth",
      "authenticated lesson/progress and positive staff workflows",
      "AI provider calls",
    ],
  };
  await writeFile(
    ".wrangler/live-browser.local.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (error) {
  console.error(redactLog((error as Error).message, process.env));
  process.exitCode = 1;
} finally {
  await browser.close();
}
