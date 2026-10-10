import { mkdir, readFile, writeFile } from "node:fs/promises";
if (process.argv.slice(2).some((arg) => arg !== "--apply-templates"))
  throw Error(
    "Only read-only audit or explicit --apply-templates is supported",
  );
const project = new URL(
  process.env.VITE_SUPABASE_URL ?? "https://invalid.invalid",
).hostname.split(".")[0];
if (!/^[a-z0-9]{20}$/.test(project) || !process.env.SUPABASE_ACCESS_TOKEN)
  throw Error(
    "Auth audit requires the existing project URL and protected Management binding",
  );
const url = `https://api.supabase.com/v1/projects/${project}/config/auth`;
async function config(method = "GET", body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
    redirect: "error",
  });
  if (!response.ok) throw Error(`Auth configuration HTTP ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}
const templates = {
  mailer_subjects_confirmation: "EngJatra — ইমেইল নিশ্চিত করো",
  mailer_subjects_recovery: "EngJatra — পাসওয়ার্ড বদলানোর লিংক",
  mailer_templates_confirmation_content: await readFile(
    "supabase/templates/confirmation.html",
    "utf8",
  ),
  mailer_templates_recovery_content: await readFile(
    "supabase/templates/recovery.html",
    "utf8",
  ),
};
for (const name of [
  "mailer_templates_confirmation_content",
  "mailer_templates_recovery_content",
] as const)
  if (
    !templates[name].includes("{{ .ConfirmationURL }}") ||
    /<script/i.test(templates[name])
  )
    throw Error("Auth template safety check failed");
if (process.argv.includes("--apply-templates"))
  await config("PATCH", templates);
const current = await config();
const report = {
  checked_at: new Date().toISOString(),
  confirmation_enforced: current.mailer_autoconfirm === false,
  google_enabled: current.external_google_enabled === true,
  smtp_configured:
    !!current.smtp_host &&
    !!current.smtp_pass &&
    !!current.smtp_user &&
    !!current.smtp_admin_email,
  branded_templates_match: Object.entries(templates).every(
    ([name, value]) => current[name] === value,
  ),
  delivery_and_google_consent_verified: false,
};
await mkdir(".wrangler", { recursive: true });
await writeFile(
  ".wrangler/auth-config.local.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
if (
  !report.confirmation_enforced ||
  (process.argv.includes("--apply-templates") &&
    !report.branded_templates_match)
)
  process.exitCode = 1;
