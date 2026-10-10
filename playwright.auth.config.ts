import { defineConfig } from "@playwright/test";
export default defineConfig({
  outputDir: "test-results/auth-ui",
  testDir: "tests/auth-ui",
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5180",
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH === ""
          ? undefined
          : (process.env.CHROMIUM_PATH ?? "/usr/bin/chromium"),
      args: ["--no-sandbox"],
    },
  },
  webServer: ["student", "admin"].map((service, index) => ({
    command: `npx vite --config apps/${service}-web/vite.config.ts --mode test --port ${5180 + index} --strictPort`,
    url: `http://localhost:${5180 + index}`,
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_ANON_KEY: "local-public-test-key",
      VITE_API_URL: "",
    },
  })),
});
