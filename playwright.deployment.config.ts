import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  outputDir: "test-results/deployment",
  testDir: "tests/deployment",
  workers: 1,
  use: {
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH === ""
          ? undefined
          : (process.env.CHROMIUM_PATH ?? "/usr/bin/chromium"),
    },
  },
  projects: [
    { name: "workers-desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "workers-mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 320, height: 740 } },
    },
  ],
  webServer: [
    {
      command:
        "node --import tsx scripts/wrangler.ts dev --config wrangler.jsonc --local --port 5177",
      url: "http://localhost:5177",
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command:
        "node --import tsx scripts/wrangler.ts dev --config apps/admin-web/wrangler.jsonc --local --port 5178",
      url: "http://localhost:5178",
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
