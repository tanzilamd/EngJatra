import { it, expect } from "vitest";
import { liveBrowserOptions } from "../scripts/live-browser-options";
it("preserves managed browser transport without putting credentials in the server/arguments", () => {
  const options = liveBrowserOptions({
    HTTPS_PROXY: "http://fixture-user:fixture-password@proxy.example:8080",
    NO_PROXY: "localhost,127.0.0.1",
    CHROMIUM_PATH: "",
  });
  expect(options.executablePath).toBeUndefined();
  expect(options.proxy).toEqual({
    server: "http://proxy.example:8080",
    username: "fixture-user",
    password: "fixture-password",
    bypass: "localhost,127.0.0.1",
  });
  expect(options.proxy?.server).not.toContain("password");
  expect(options.args.join(" ")).not.toContain("password");
  expect(liveBrowserOptions({})).not.toHaveProperty("proxy");
});
