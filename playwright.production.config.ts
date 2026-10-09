import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/production",
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5175",
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH === ""
          ? undefined
          : (process.env.CHROMIUM_PATH ?? "/usr/bin/chromium"),
      args: ["--no-sandbox"],
    },
  },
  projects: [
    { name: "production-desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "production-mobile",
      use: { ...devices["Pixel 5"], viewport: { width: 320, height: 780 } },
    },
  ],
  webServer: {
    command:
      'npx concurrently -k "npx vite preview --config apps/student-web/vite.config.ts --port 5175 --strictPort" "npx vite preview --config apps/admin-web/vite.config.ts --port 5176 --strictPort"',
    url: "http://localhost:5175",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
