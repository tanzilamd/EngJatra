import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  outputDir: "test-results/e2e",
  testDir: "tests/e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH === ""
          ? undefined
          : (process.env.CHROMIUM_PATH ?? "/usr/bin/chromium"),
      args: ["--no-sandbox"],
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"], viewport: { width: 320, height: 780 } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
