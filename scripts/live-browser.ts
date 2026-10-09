import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { settings } from "./deployment-config";
import { redactLog } from "./redact-log";

// Actual public origins only: no request interception, mocks or demo adapters.
const config = settings({
  ...process.env,
  GEMMA_FREE_CONFIRMED: "false",
  LLAMA_FREE_CONFIRMED: "false",
});
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH === ""
      ? undefined
      : (process.env.CHROMIUM_PATH ?? "/usr/bin/chromium"),
  args: ["--no-sandbox"],
});
const results: { service: string; width: number; checks: string[] }[] = [];
try {
  for (const [service, origin] of [
    ["student", config.student],
    ["admin", config.admin],
  ]) {
    for (const width of [1280, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
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
            name:
              service === "student"
                ? "সহজ ধাপে, নিজের গতিতে ইংরেজি শিখুন।"
                : "প্রশাসনে প্রবেশ",
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
            buttons: getComputedStyle(document.querySelector("button")!)
              .backgroundColor,
          };
        });
        if (
          !style.fonts ||
          !style.fit ||
          !style.images ||
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
            .getByRole("button", { name: "নতুন অ্যাকাউন্ট", exact: true })
            .click();
          await page
            .getByRole("button", { name: "অ্যাকাউন্ট তৈরি করি", exact: true })
            .waitFor();
        }
        await page
          .getByRole("button", { name: "পাসওয়ার্ড ভুলে গেছি", exact: true })
          .click();
        await page
          .getByRole("button", { name: "ফেরত পাওয়ার ইমেইল পাঠাও", exact: true })
          .waitFor();
        await page.goto(`${origin}/learn`, { waitUntil: "networkidle" });
        await page.getByLabel("ইমেইল", { exact: true }).waitFor();
        await page.reload({ waitUntil: "networkidle" });
        if (errors.length) throw Error(`${service}: ${errors.join(", ")}`);
        results.push({
          service,
          width,
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
