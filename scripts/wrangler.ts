import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import {
  gatewayDiagnostic,
  saveWranglerResult,
  wranglerResult,
} from "./deployment-recovery";
import { createInterface } from "node:readline";
import { redactLog } from "./redact-log";
const config = resolve(".wrangler/config");
mkdirSync(config, { recursive: true });
rmSync(wranglerResult, { force: true });
let gateway: number | undefined;
const child = spawn(
  process.execPath,
  ["node_modules/wrangler/bin/wrangler.js", ...process.argv.slice(2)],
  {
    stdio: ["inherit", "pipe", "pipe"],
    env: {
      ...process.env,
      XDG_CONFIG_HOME: config,
      WRANGLER_SEND_METRICS: "false",
    },
  },
);
for (const [stream, output] of [
  [child.stdout, process.stdout],
  [child.stderr, process.stderr],
] as const) {
  if (stream)
    createInterface({ input: stream }).on("line", (line) => {
      gateway ??= gatewayDiagnostic(line);
      output.write(`${redactLog(line, process.env)}\n`);
    });
}
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => child.kill(signal));
child.on("error", () => {
  process.exitCode = 1;
});
child.on("close", async (code) => {
  process.exitCode = code ?? 1;
  await saveWranglerResult(code ?? 1, gateway);
  if (code !== 0 && gateway && process.env.GITHUB_ACTIONS === "true")
    console.error(
      `::error title=Cloudflare gateway failure::Wrangler reported HTTP ${gateway}. Publishing may have been accepted; recovery checks active versions before any further publishing.`,
    );
});
