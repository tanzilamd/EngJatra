import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { redactLog } from "./redact-log";
const config = resolve(".wrangler/config");
mkdirSync(config, { recursive: true });
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
    createInterface({ input: stream }).on("line", (line) =>
      output.write(`${redactLog(line, process.env)}\n`),
    );
}
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
