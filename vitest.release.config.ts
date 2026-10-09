import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/release.validation.ts"], testTimeout: 30000 },
});
