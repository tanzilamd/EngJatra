import { readFile } from "node:fs/promises";
import { parse as parseJsonc, type ParseError } from "jsonc-parser";
import { resolve, dirname } from "node:path";
export type Settings = Record<string, string | undefined>;
export const targets = [
  {
    service: "student",
    name: "engjatra",
    config: "wrangler.jsonc",
    directory: "apps/student-web/dist",
  },
  {
    service: "admin",
    name: "engjatra-admin",
    config: "apps/admin-web/wrangler.jsonc",
    directory: "apps/admin-web/dist",
  },
  { service: "api", name: "engjatra-api", config: "workers/api/wrangler.toml" },
] as const;
export const compatibilityDate = "2026-10-09";
export type DeploymentConfig = {
  supabase: string;
  publicKey: string;
  student: string;
  admin: string;
  api: string;
  account?: string;
  token?: string;
  gemma: { enabled: boolean; model?: string; key?: string };
  llama: { enabled: boolean; model?: string; key?: string };
};
export function origin(value: string | undefined, name: string): string {
  try {
    const url = new URL(value ?? "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      /^(localhost|127\.|\[|0\.0\.0\.0)/.test(url.hostname)
    )
      throw Error();
    return url.origin;
  } catch {
    throw Error(
      `${name}: require a public HTTPS origin, without a path or credentials`,
    );
  }
}
export function publicKey(value: string | undefined): string {
  if (value && /^sb_publishable_[\w-]{10,}$/.test(value)) return value;
  try {
    const pieces = (value ?? "").split(".");
    if (
      pieces.length === 3 &&
      JSON.parse(Buffer.from(pieces[1], "base64url").toString()).role === "anon"
    )
      return value!;
  } catch {
    /* Do not expose the supplied value. */
  }
  throw Error(
    "VITE_SUPABASE_ANON_KEY: require a publishable key or legacy anon JWT; privileged/session keys are forbidden",
  );
}
export function settings(env: Settings, credentials = true): DeploymentConfig {
  const errors: string[] = [];
  const read = (fn: () => string) => {
    try {
      return fn();
    } catch (error) {
      errors.push((error as Error).message);
      return "";
    }
  };
  const supabase = read(() =>
    origin(env.VITE_SUPABASE_URL, "VITE_SUPABASE_URL"),
  );
  if (supabase && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supabase))
    errors.push(
      "VITE_SUPABASE_URL: current adapter requires a Supabase project origin",
    );
  const key = read(() => publicKey(env.VITE_SUPABASE_ANON_KEY));
  const student = read(() => origin(env.CONTENT_URL, "CONTENT_URL"));
  const api = read(() => origin(env.VITE_API_URL, "VITE_API_URL"));
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .filter(Boolean)
    .map((v) => read(() => origin(v.trim(), "ALLOWED_ORIGINS")));
  if (
    allowed.length !== 2 ||
    new Set(allowed).size !== 2 ||
    !allowed.includes(student)
  )
    errors.push(
      "ALLOWED_ORIGINS: require exactly the student and separate admin HTTPS origins",
    );
  const admin = allowed.find((v) => v !== student) ?? "";
  if (api && allowed.includes(api))
    errors.push("VITE_API_URL: API must have a separate origin");
  for (const [service, name] of [
    [student, "engjatra"],
    [admin, "engjatra-admin"],
    [api, "engjatra-api"],
  ]) {
    if (
      service.endsWith(".workers.dev") &&
      !service.startsWith(`https://${name}.`)
    )
      errors.push(
        `${name}: workers.dev origin must match its configured Worker name`,
      );
  }
  for (const [name, expected] of [
    ["SUPABASE_URL", supabase],
    ["SUPABASE_ANON_KEY", key],
    ["ENVIRONMENT", "production"],
    ["LOCAL_DEMO", "false"],
  ]) {
    if (env[name] && env[name] !== expected)
      errors.push(`${name}: conflicts with managed production configuration`);
  }
  if (credentials) {
    if (!/^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID ?? ""))
      errors.push("CLOUDFLARE_ACCOUNT_ID: missing or invalid account ID");
    if (
      !env.CLOUDFLARE_API_TOKEN ||
      env.CLOUDFLARE_API_TOKEN.length < 10 ||
      /[<>\s]/.test(env.CLOUDFLARE_API_TOKEN)
    )
      errors.push(
        "CLOUDFLARE_API_TOKEN: configure an authorized Workers deployment token securely",
      );
  }
  const provider = (name: "GEMMA" | "LLAMA") => {
    const flag = env[`${name}_FREE_CONFIRMED`] ?? "false";
    const enabled = flag === "true";
    if (!["true", "false"].includes(flag))
      errors.push(`${name}_FREE_CONFIRMED: use true or false`);
    const model = env[`${name}_MODEL`],
      key = env[`${name}_API_KEY`];
    if (
      enabled &&
      (!model ||
        !(name === "GEMMA" ? /^gemma[-\w.]+$/ : /^llama[-\w.]+$/).test(model))
    )
      errors.push(
        `${name}_MODEL: enabled provider requires a compatible verified model ID`,
      );
    if (enabled && !key)
      errors.push(
        `${name}_API_KEY: enabled provider requires its server secret`,
      );
    return { enabled, model, key };
  };
  const gemma = provider("GEMMA"),
    llama = provider("LLAMA");
  if (errors.length)
    throw Error(`Deployment blocked:\n- ${errors.join("\n- ")}`);
  return {
    supabase,
    publicKey: key,
    student,
    admin,
    api,
    account: env.CLOUDFLARE_ACCOUNT_ID,
    token: env.CLOUDFLARE_API_TOKEN,
    gemma,
    llama,
  };
}
export async function inspectTargets(root = process.cwd()) {
  for (const target of targets) {
    const path = resolve(root, target.config);
    const raw = await readFile(path, "utf8");
    if (target.service === "api") {
      if (
        !raw.includes(`name = "${target.name}"`) ||
        !raw.includes(`compatibility_date = "${compatibilityDate}"`) ||
        !raw.includes('main = "src/index.ts"') ||
        !raw.includes("keep_vars = true") ||
        /\[assets\]|^\w+ = ""/m.test(raw)
      )
        throw Error(
          "API configuration: wrong target, missing compatibility/entrypoint/keep_vars, blank binding or unexpected assets",
        );
    } else {
      const errors: ParseError[] = [];
      const config = parseJsonc(raw, errors, { allowTrailingComma: true });
      if (errors.length || !config || typeof config !== "object")
        throw Error(`${target.service}: invalid Wrangler JSONC`);
      if (
        config.name !== target.name ||
        config.compatibility_date !== compatibilityDate ||
        config.main ||
        config.assets?.not_found_handling !== "single-page-application" ||
        config.assets?.run_worker_first !== false ||
        resolve(dirname(path), config.assets?.directory ?? "") !==
          resolve(root, target.directory)
      )
        throw Error(
          `${target.service}: invalid static target, directory, compatibility date or SPA configuration`,
        );
    }
  }
}
export function apiConfiguration(config: DeploymentConfig) {
  return {
    name: "engjatra-api",
    main: resolve("workers/api/src/index.ts"),
    compatibility_date: compatibilityDate,
    workers_dev: true,
    keep_vars: true,
    observability: {
      enabled: true,
      head_sampling_rate: 0.1,
      logs: { invocation_logs: false },
    },
    vars: {
      ENVIRONMENT: "production",
      LOCAL_DEMO: "false",
      SUPABASE_URL: config.supabase,
      CONTENT_URL: config.student,
      ALLOWED_ORIGINS: `${config.student},${config.admin}`,
      GEMMA_FREE_CONFIRMED: String(config.gemma.enabled),
      LLAMA_FREE_CONFIRMED: String(config.llama.enabled),
      ...(config.gemma.model ? { GEMMA_MODEL: config.gemma.model } : {}),
      ...(config.llama.model ? { LLAMA_MODEL: config.llama.model } : {}),
    },
  };
}
export function apiSecrets(config: DeploymentConfig) {
  return {
    SUPABASE_ANON_KEY: config.publicKey,
    ...(config.gemma.enabled ? { GEMMA_API_KEY: config.gemma.key! } : {}),
    ...(config.llama.enabled ? { LLAMA_API_KEY: config.llama.key! } : {}),
  };
}
