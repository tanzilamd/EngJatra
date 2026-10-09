# Production activation and secure operations

The selected production architecture is **three Cloudflare Workers**: student `engjatra` and admin `engjatra-admin` use Static Assets; `engjatra-api` runs protected server code. Pages is not required. The sole deployment trigger is `.github/workflows/ci.yml` on `main`, or its manual rerun from main for first activation/recovery. Disable native Workers Builds automatic deploys for the same targets to avoid competing writes.

Start with the concise Bengali checklist in `docs/DEPLOYMENT_SIMPLE_BN.md`. `docs/ENVIRONMENT_VARIABLES.md` is the complete authoritative inventory with exact credential sources/destinations, phases and observed status. No secret saved in Codex propagates automatically to another dashboard. The current session has no ready Cloudflare/application credentials, no dashboard access, and no verified deployed origins.

## One-time setup and source-controlled targets

| Service | Name | Config | Artifact / authority |
| --- | --- | --- | --- |
| Student | `engjatra` | root `wrangler.jsonc` | `apps/student-web/dist`, public assets only |
| Admin | `engjatra-admin` | `apps/admin-web/wrangler.jsonc` | `apps/admin-web/dist`, no private runtime data |
| API | `engjatra-api` | `workers/api/wrangler.toml`; validated ignored deployment config | `workers/api/src/index.ts`, Auth/RLS/staff authorization |

All compatibility dates are `2026-10-09`. Student/admin set an explicit assets directory and SPA handling, without a script or worker-first routing. Generated Pages catch-all `_redirects` is removed; it is not needed by Worker SPA routing. `_headers` remains for CSP/frame denial and immutable content caching. Exact custom API origin is added to CSP at build time. No microphone/camera permission or public source maps.

Names are fixed to prevent accidentally uploading API code to the student's existing `engjatra` target. No automatic renaming, framework autoconfiguration or generic target selection is used. Existing matching Workers may be reused; the scoped token can create missing matching Free Workers. Custom domain/DNS provisioning is not automatic. Use the actual account subdomain/origins; no example hostname or `engjatra.pages.dev` reservation is claimed.

GitHub Settings → Secrets and variables → Actions is the one-time input destination. `CLOUDFLARE_API_TOKEN`, optional AI keys are Secrets; account ID and public fields are Variables. The `production` environment must permit the desired automatic runs, subject to owner policy; branch/environment protection is never bypassed. No personal GitHub write token or Supabase service-role credential is needed.

## Readiness, deployment and proof

- `npm run deploy:check`: validates required production configuration/credentials, both artifacts, public scans and all three Wrangler dry runs; publishes nothing. `--configuration-only` checks input before building. `--live` additionally checks the actual Supabase public blocklist and denial of anonymous private RPC.
- `npm run deploy:check -- --offline`: checks only checked-in targets, built assets and three compilations without credentials. Its message explicitly says external readiness is unverified; build first.
- `npm run deploy:all`: requires main (or matching main CI SHA), current QA evidence and configuration. It runs QA if the commit/source proof is stale, rebuilds with the real public values, retains the prior verified content artifact, scans, dry-runs, checks Supabase and Cloudflare read access, then deploys API/student/admin sequentially and verifies active commit tags plus live artifacts/security. No false overall success after partial failure. `--dry-run` performs the configured path without publishing or requiring Cloudflare credentials; fixture credentials are tests, not integration.
- `npm run deploy:verify`: read-only active-version tags, all 96 unit hashes, six libraries, student/admin HTML/SPA/security headers, API health/CORS/blocklist and anonymous/spoofed-role denial. Does not prove user sign-in, OAuth, SMTP delivery, cross-device sync or eligible live AI.

The full QA command writes an ignored source/commit fingerprint. CI transfers that proof to the deploy job and rebuilds there with public production config; secrets are never provided to the general QA job. Source changes invalidate the proof. GitHub's deploy job uses read-only built-in repository permissions for the previous verified artifact. It is serialized with other production runs; none are force-cancelled mid-deploy.

API managed config supplies required public runtime bindings and explicitly sets `ENVIRONMENT=production`, `LOCAL_DEMO=false`, and false AI flags unless verified. API secrets are attached additively to the same version using Wrangler `--secrets-file`; omitted secrets are not deleted. The temporary file is ignored, mode 0600, removed after each operation. Checked-in API config has `keep_vars=true` and no blank URL/key/model defaults. Direct diagnostic Wrangler uploads preserve dashboard vars; managed Actions config is authoritative for values it supplies. `--strict` rejects conflicting remote edits; investigate rather than override it.

Three-target deployment is not a distributed transaction. A later upload or live verification can fail after an earlier target updated. Logs/Cloudflare version history identify what changed; no success receipt is written unless all verification succeeds. Supabase migrations and sensitive admin grants/deletions are not run by the deploy job.

## Supabase database and authentication

Known supplied project: `https://ahxhhasraganuqspfqer.supabase.co`; not a verified integration. Browser and server accept the same public publishable/anon key under their existing `*_ANON_KEY` names. Service-role/secret/learner JWTs are rejected by deployment readiness. Server Auth uses the actual user JWT and remote `/auth/v1/user`; staff permissions are DB-backed, never email domains or mutable metadata.

Before applying SQL, inspect the project and backup/data safety. In SQL Editor, first check `select to_regclass('supabase_migrations.schema_migrations');` and existing application tables. If a migration history exists, inspect it. If application schema already exists without a tracked history, reconcile it before proceeding; do not infer absence from the history alone. Apply only reviewed missing files in lexical order, starting with `supabase/migrations/202610090001_initial.sql` on a genuinely fresh schema. That initial migration is not idempotent. Never rerun it blindly, drop learner data, or disable RLS. Existing committed/applied migrations remain unchanged; upgrades need new forward files.

Verify the owner Auth UUID using trusted project administration, then insert that exact UUID into `admin_memberships` with role `owner` through protected SQL. Record an `admin_audit` action with columns `actor`, `action`, `object_id`. Never use an editable email/profile claim as the bootstrap. Sensitive role grants require verified operator authorization.

Authentication → URL Configuration: Site URL = actual student origin. Allow each student/admin origin, its root `/`, and `/?recovery=1`. These match `packages/ui/Auth.tsx` signup `emailRedirectTo: location.origin`, Google `redirectTo: location.origin`, and reset redirect `location.origin + '/?recovery=1'`. Production entries should be exact, not wildcard domains. Development-only redirects can cover `http://localhost:5173/**` and `http://localhost:5174/**`; do not add arbitrary production hosts. There is no automatic preview OAuth configuration.

Google Cloud web OAuth client callback = `https://ahxhhasraganuqspfqer.supabase.co/auth/v1/callback`. Put its Client ID/Client Secret in Supabase Authentication → Providers → Google, not application env. Configure Google consent/branding/privacy/scopes/test users and any required verification through the owner account. App origins belong in the Supabase allowlist; this implementation does not use a browser Google SDK or require a frontend Google secret. Google login is optional for initial email-only deployment and remains unverified until a real redirect/session journey passes.

For Brevo, verify the real sender/domain in Brevo; use SMTP & API to obtain **SMTP login and SMTP key/password**, not its REST key. Supabase Authentication → Email → SMTP settings: `smtp-relay.brevo.com`, port `587`/STARTTLS, actual verified sender/name, login/password. Keep email confirmation/recovery enabled according to policy and test real inbox delivery. No app/Worker SMTP integration or new SMTP env is added.

After configuration test two real learners, expiry/recovery, cross-read/write denial, membership escalation, reviewer/admin restrictions, two-device checkpoint conflicts/idempotency, history export/deletion, reports and audits. Local PostgreSQL with an auth shim does not substitute for live Supabase Auth/PostgREST.

## AI account verification

Google generateContent and Groq OpenAI-compatible adapters are implemented and locally fixture-tested. Current official Google Gemma API docs list `gemma-4-26b-a4b-it` and `gemma-4-31b-it`; public pricing lists Gemma 4 input/output free and indicates free-tier training use. Groq docs list `llama-3.1-8b-instant` and `llama-3.3-70b-versatile`. These are documentation observations, **not account configuration or proof of a successful API call**. Verify exact account access, quota/privacy and response contract before choosing a model or turning on either free flag. Models/keys remain blank and switches false in examples.

Keys only reach the API Worker. True flags require model/key consistency; neither provider must be active for initial production. Preserve caps, shared budgets, bounded timeouts/retries, unknown-429 classification, no invented reset times, and authored continuity. No paid billing is activated and no paid alternative is implemented.

## Versioned content, corrections and rollback

Actions saves the verified student artifact for 90 days and downloads the latest available verified one before subsequent deploys. The build retains **all** prior immutable content directories from that artifact and keeps a newer already-published content manifest when rebuilding the unchanged original source version. An existing immutable version cannot change bytes; bump the exporter content version for reviewed source changes. An expired/lost baseline or mismatched remote content blocks deployment; restore an approved archive rather than delete versions. Free artifact/asset quotas are finite; the owner must retain/export the latest baseline and watch storage.

Private editor/reviewer drafts remain in Supabase. The public-safe export and `npm run release:export` are review tools, not a competing production trigger. Validate the exported patch and learner preview, apply the reviewed changes to canonical public source/unit data, increment the immutable release version in `scripts/export-content.ts`, run QA, commit/push main. Actions publishes the reviewed source and retained assets. Do not commit private notes/statuses. After actual deployed hash verification an authorized owner records the matching `content_releases` outcome/audit through protected SQL; ordinary browser RPC cannot mark deployment. Repository deployments do not silently promote editorial drafts or invent teacher approval.

Rollback: Cloudflare Worker → Deployments → select the last known good version for each affected target, verify site/API/content/CORS again, then fix or safely revert source on main and push. This is incident recovery, not a second automatic trigger. Never force-push history. Code rollback does not undo SQL, rotate secrets back safely, or delete progress. Preserve old immutable directories, use backups for DB incidents, and reconcile release records after verified recovery.

Sensitive account deletion stays a verified operator workflow: verify requester, export/backup when appropriate, remove that exact Auth user with approved project tooling, confirm cascade and deliberate staff audit retention, then resolve the deletion request. Never say deleted before it happened.

## Remaining live gates

Cloudflare token/account/origins and actual Actions execution; live Supabase migration/RLS/Auth/progress; inbox SMTP; Google consent/redirect flow; provider account free eligibility and live healthy/fallback/quota behavior; available subdomains, Free-plan limits/alerts/backups; bilingual semantic/licensing/legal/minor review and real Bangla-speaking learner/mobile/slow-network pilot. None is proven by a local build or dry run.
