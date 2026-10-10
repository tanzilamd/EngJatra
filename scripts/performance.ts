import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { liveBrowserOptions } from "./live-browser-options";
declare global {
  interface Window {
    engjatraLab: { lcp: number; cls: number; interaction: number | null };
  }
}
// Lab samples, not field Core Web Vitals. No accounts, third-party analytics or secrets.
const output = process.argv[2] ?? ".wrangler/performance.local.json";
const browser = await chromium.launch(liveBrowserOptions());
const results = [];
try {
  for (const width of [1440, 390])
    for (let run = 1; run <= 2; run++) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        isMobile: width === 390,
        hasTouch: width === 390,
      });
      try {
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.clearBrowserCache");
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: 150,
          downloadThroughput: 200000,
          uploadThroughput: 93750,
        });
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await page.addInitScript(() => {
          const metrics = {
            lcp: 0,
            cls: 0,
            interaction: null as number | null,
          };
          Object.assign(window, { engjatraLab: metrics });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              metrics.lcp = entry.startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const shift = entry as PerformanceEntry & {
                hadRecentInput: boolean;
                value: number;
              };
              if (!shift.hadRecentInput) metrics.cls += shift.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
          document.addEventListener(
            "click",
            () => {
              const start = performance.now();
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  metrics.interaction = performance.now() - start;
                }),
              );
            },
            { capture: true, once: true },
          );
        });
        await page.goto("https://engjatra.nuvomi.workers.dev", {
          waitUntil: "networkidle",
          timeout: 60000,
        });
        await page.evaluate(() => document.fonts.ready);
        await page
          .getByRole("button", {
            name: /^(নতুন অ্যাকাউন্ট|অ্যাকাউন্ট তৈরি করো)$/,
          })
          .click();
        await page.waitForFunction(
          () =>
            (window as Window & { engjatraLab: { interaction: number | null } })
              .engjatraLab.interaction !== null,
        );
        const measurement = await page.evaluate(() => ({
          ...(
            window as Window & {
              engjatraLab: { lcp: number; cls: number; interaction: number };
            }
          ).engjatraLab,
          initialJsBytes: performance
            .getEntriesByType("resource")
            .filter((entry) => entry.name.endsWith(".js"))
            .reduce(
              (sum, entry) =>
                sum + (entry as PerformanceResourceTiming).encodedBodySize,
              0,
            ),
        }));
        results.push({ width, run, ...measurement });
      } finally {
        await context.close();
      }
    }
} finally {
  await browser.close();
}
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  JSON.stringify(
    {
      measured_at: new Date().toISOString(),
      mode: "Cold Chromium; 4x CPU; 1.6 Mbps down; 150ms added latency; two lab samples per viewport. Interaction is click-to-two-animation-frames, not field INP.",
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results, null, 2));
