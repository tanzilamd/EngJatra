import { readFile, readdir, mkdir, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { redactLog } from "./redact-log";

export type Migration = { version: string; name: string; sha256: string };
export type History = {
  project_ref: string;
  captured_at: string;
  migrations: { version: string; sha256?: string }[];
  application_tables: string[];
  rls_disabled: string[];
};
export async function migrationFiles(
  root = process.cwd(),
): Promise<Migration[]> {
  const files = (await readdir(`${root}/supabase/migrations`))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const seen = new Set<string>();
  return Promise.all(
    files.map(async (name) => {
      const match = /^(\d{12,14})_[a-z0-9_]+\.sql$/.exec(name);
      if (!match || seen.has(match[1]))
        throw Error(
          "Migration names require distinct sortable timestamp versions",
        );
      seen.add(match[1]);
      const body = await readFile(
        `${root}/supabase/migrations/${name}`,
        "utf8",
      );
      if (!body.trim()) throw Error("Empty SQL migration");
      return {
        version: match[1],
        name,
        sha256: createHash("sha256").update(body).digest("hex"),
      };
    }),
  );
}
export async function checkManifest(root = process.cwd()) {
  const files = await migrationFiles(root);
  const manifest = JSON.parse(
    await readFile(`${root}/supabase/migration-manifest.json`, "utf8"),
  ) as { migrations: Migration[] };
  if (
    !Array.isArray(manifest.migrations) ||
    files.length !== manifest.migrations.length ||
    files.some(
      (file, i) =>
        file.version !== manifest.migrations[i].version ||
        file.name !== manifest.migrations[i].name ||
        file.sha256 !== manifest.migrations[i].sha256,
    )
  )
    throw Error(
      "Migration checksum manifest differs: do not edit applied SQL; add a forward migration and reviewed manifest entry",
    );
  return files;
}
export function planMigrations(files: Migration[], history: History) {
  if (
    !/^[a-z0-9-]+$/.test(history.project_ref) ||
    !Number.isFinite(Date.parse(history.captured_at)) ||
    !Array.isArray(history.migrations) ||
    !Array.isArray(history.application_tables) ||
    !Array.isArray(history.rls_disabled)
  )
    throw Error("Invalid migration history snapshot");
  if (
    history.migrations.some(
      (item) =>
        !/^\d{12,14}$/.test(item.version) ||
        (item.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(item.sha256)),
    ) ||
    [...history.application_tables, ...history.rls_disabled].some(
      (name) => typeof name !== "string" || !/^[a-z_][a-z0-9_]*$/.test(name),
    )
  )
    throw Error("Invalid migration metadata; no input values logged");
  const blockers: string[] = [];
  const versions = new Set(history.migrations.map((item) => item.version));
  if (versions.size !== history.migrations.length)
    blockers.push("Duplicate remote migration versions");
  const latest = [...versions].sort().at(-1);
  const pending = files.filter((file) => !versions.has(file.version));
  if (history.rls_disabled.length)
    blockers.push(
      "RLS disabled on application tables; investigate, never bypass it",
    );
  if (!history.migrations.length && history.application_tables.length)
    blockers.push(
      "Application schema exists without tracked history; owner reconciliation required, never rerun initial SQL",
    );
  for (const item of history.migrations) {
    const file = files.find((file) => file.version === item.version);
    if (!file)
      blockers.push(
        `Remote migration ${item.version} absent from repository; reconcile before changing schema`,
      );
    else if (item.sha256 && file.sha256 !== item.sha256)
      blockers.push(`Applied migration ${item.version} checksum mismatch`);
    else if (!item.sha256)
      blockers.push(
        `Applied migration ${item.version} lacks a verified checksum; inspect original SQL before certifying history`,
      );
  }
  if (latest && pending.some((file) => file.version < latest))
    blockers.push("Pending migrations precede already applied versions");
  return {
    project_ref: history.project_ref,
    history_captured_at: history.captured_at,
    state: blockers.length ? "blocked" : "review_required",
    pending,
    blockers,
    scope:
      "plan only; no production SQL applied, backups/authorization/semantic safety must be verified before execution",
  };
}
const applicationTables = [
  "profiles",
  "learner_paths",
  "learner_settings",
  "unit_progress",
  "vocabulary_mastery",
  "mistake_events",
  "activity_attempts",
  "checkpoint_receipts",
  "conversations",
  "messages",
  "user_reports",
  "admin_memberships",
  "content_overrides",
  "content_releases",
  "admin_audit",
  "usage_counters",
  "provider_health",
  "content_blocks",
];
export async function remoteHistory(
  project: string,
  token: string,
  network: typeof fetch = fetch,
): Promise<History> {
  if (!/^[a-z0-9-]+$/.test(project) || !token)
    throw Error(
      "Project-scoped database-read connection required; no credentials in chat",
    );
  async function query(sql: string) {
    const response = await network(
      `https://api.supabase.com/v1/projects/${project}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql, read_only: true }),
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      throw Error(
        `Supabase management read-only audit HTTP ${response.status}; no query/data/credential body logged`,
      );
    let rows: Record<string, unknown>[];
    try {
      rows = await response.json();
    } catch (error) {
      throw Error("Unsupported Management API JSON; no response body logged", {
        cause: error,
      });
    }
    if (!Array.isArray(rows))
      throw Error(
        "Unsupported Management API result; beta interface must be verified before activation",
      );
    return rows;
  }
  const catalog = await query(
    `select c.relname as name, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname in (${applicationTables.map((t) => `'${t}'`).join(",")});`,
  );
  if (
    catalog.some(
      (row) => typeof row.name !== "string" || typeof row.rls !== "boolean",
    )
  )
    throw Error("Invalid database catalog audit response");
  const exists = await query(
    "select to_regclass('supabase_migrations.schema_migrations') is not null as present, to_regclass('engjatra_ops.migration_checksums') is not null as checksums_present;",
  );
  if (typeof exists[0]?.present !== "boolean")
    throw Error("Invalid migration history discovery response");
  const migrations = exists[0].present
    ? await query(
        "select version from supabase_migrations.schema_migrations order by version;",
      )
    : [];
  if (
    migrations.some(
      (row) =>
        typeof row.version !== "string" || !/^\d{12,14}$/.test(row.version),
    )
  )
    throw Error("Invalid remote migration history version");
  const checksums =
    exists[0].checksums_present === true
      ? await query(
          "select version, sha256 from engjatra_ops.migration_checksums order by version;",
        )
      : [];
  if (
    checksums.some(
      (row) =>
        typeof row.version !== "string" ||
        typeof row.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(row.sha256),
    )
  )
    throw Error("Invalid protected migration checksum records");
  return {
    project_ref: project,
    captured_at: new Date().toISOString(),
    migrations: migrations.map((row) => ({
      version: row.version as string,
      ...(checksums.find((c) => c.version === row.version)
        ? {
            sha256: checksums.find((c) => c.version === row.version)!
              .sha256 as string,
          }
        : {}),
    })),
    application_tables: catalog.map((row) => row.name as string),
    rls_disabled: catalog
      .filter((row) => row.rls === false)
      .map((row) => row.name as string),
  };
}
async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "plan") {
    await rm(".wrangler/migrations/review.local.sql", { force: true });
    await rm(".wrangler/migrations/plan.local.json", { force: true });
  }
  if (mode === "audit")
    await rm(".wrangler/migrations/audit.local.json", { force: true });
  for (const file of [".env", ".deploy.env"])
    if (existsSync(file)) process.loadEnvFile(file);
  const files = await checkManifest();
  if (mode === "check" && !args.length) {
    // Compare against the fetched branch; do not silently bless rewritten existing SQL.
    const changed = execFileSync(
      "git",
      ["diff", "--name-status", "origin/main", "--", "supabase/migrations"],
      { encoding: "utf8" },
    ).trim();
    if (
      changed
        .split("\n")
        .filter(Boolean)
        .some((line) => !line.startsWith("A\t"))
    )
      throw Error(
        "Previously committed SQL changed/deleted; use append-only migration files",
      );
    console.log(
      `PASS ${files.length} local migration checksum(s) and append-only source; live schema/history unverified.`,
    );
    return;
  }
  let history: History;
  if (mode === "plan" && args.length === 2 && args[0] === "--history")
    history = JSON.parse(await readFile(args[1], "utf8"));
  else if (mode === "plan" && args.length === 2 && args[0] === "--project-ref")
    history = await remoteHistory(
      args[1],
      process.env.SUPABASE_ACCESS_TOKEN ?? "",
    );
  else if ((mode === "plan" || mode === "audit") && args.length === 0) {
    const supplied = process.env.VITE_SUPABASE_URL ?? "";
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(supplied))
      throw Error(
        "Set the existing public Supabase project origin before database audit",
      );
    const url = new URL(supplied);
    history = await remoteHistory(
      url.hostname.split(".")[0],
      process.env.SUPABASE_ACCESS_TOKEN ?? "",
    );
  } else
    throw Error(
      "Use check or plan --history <operator snapshot> / --project-ref <approved project>. Planning never applies SQL.",
    );
  const plan = planMigrations(files, history);
  await mkdir(".wrangler/migrations", { recursive: true });
  if (mode === "audit") {
    const missing = applicationTables.filter(
      (name) => !history.application_tables.includes(name),
    );
    const result = {
      ...plan,
      missing_application_tables: missing,
      scope:
        "read-only catalog/history/checksum audit; not real Auth/user/RLS negative tests",
    };
    await writeFile(
      ".wrangler/migrations/audit.local.json",
      JSON.stringify(result, null, 2),
      { mode: 0o600 },
    );
    if (plan.blockers.length || missing.length || plan.pending.length)
      throw Error(
        "Database audit incomplete/failed: missing migrations/tables, unverifiable checksums or RLS; inspect private audit evidence before changing anything",
      );
    console.log(
      "PASS read-only schema/history/checksum audit; real user/RLS tests remain separate.",
    );
    return;
  }
  await writeFile(
    ".wrangler/migrations/plan.local.json",
    JSON.stringify(plan, null, 2),
    { mode: 0o600 },
  );
  // Remove any old bundle before blocked plans; it must not be mistaken for this result.
  await rm(".wrangler/migrations/review.local.sql", { force: true });
  if (plan.blockers.length)
    throw Error(`Migration plan blocked:\n- ${plan.blockers.join("\n- ")}`);
  const sql = await Promise.all(
    plan.pending.map(
      async (file) =>
        `-- ${file.name} sha256=${file.sha256}\n${await readFile(`supabase/migrations/${file.name}`, "utf8")}`,
    ),
  );
  await writeFile(
    ".wrangler/migrations/review.local.sql",
    `-- REVIEW ONLY; verify project, history, backup and approval. No script executes this bundle.\nBEGIN;\n${sql.join("\n")}\nCOMMIT;\n`,
    { mode: 0o600 },
  );
  console.log(JSON.stringify(plan, null, 2));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await main();
  } catch (error) {
    console.error(redactLog((error as Error).message, process.env));
    process.exitCode = 1;
  }
}
