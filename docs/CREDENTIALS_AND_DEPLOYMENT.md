# Credentials and production activation

Local work does not need external credentials. Enter values in the relevant secure environment/dashboard, never in source, issue comments or chat. Production builds fail closed without connected auth and never enable demo accounts. A build or dry run does not deploy.

## Required operator configuration

| Setting | Where | Why |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Both Pages build environments / ignored `.env` | Public Supabase project URL and publishable/anon key for browser Auth; not an authorization bypass |
| `VITE_API_URL` | Both Pages build environments | HTTPS Worker origin; update generated CSP for a custom domain |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Worker bindings | User-session verification and user-authorized REST/RPC; no service-role key required |
| `ALLOWED_ORIGINS` | Worker bindings | Exact student and admin origins, comma separated; no wildcard |
| `CONTENT_URL` | Worker binding | Approved HTTPS student/CDN origin, without trailing path, for lesson facts and release proof |
| `GEMMA_API_KEY`, `GEMMA_MODEL` | Worker secret/model bindings | Verified eligible free Google Gemma endpoint |
| `LLAMA_API_KEY`, `LLAMA_MODEL` | Worker secret/model bindings | Independently verified eligible free Groq Llama endpoint |
| `GEMMA_FREE_CONFIRMED`, `LLAMA_FREE_CONFIRMED` | Worker vars, initially false | Operator attestation of current model/account free eligibility; never enable billing |
| `ENVIRONMENT` | Worker vars | `production`; never set `LOCAL_DEMO` on a deployed Worker |

The Gemma and Groq adapter HTTP contracts are locally mocked and tested. Official documentation destinations were initially blocked by this cloud environment's restricted egress. Do not treat fixture names as live model IDs. Verify current official Google Gemma/Gemini and Groq API docs, response behavior, exact model IDs, privacy terms and account-specific free limits before setting either free switch true. If the independently eligible free Groq Llama endpoint is unavailable, keep it disabled; selecting another provider requires an adapter change and tests. No paid fallback is implemented.

## Supabase

1. Choose an owner-approved Free project. Inspect backup and existing schema before applying `supabase/migrations/202610090001_initial.sql` through the secure SQL editor or approved migration tooling. This run applied it only to an isolated local PostgreSQL test database.
2. Configure email confirmation/recovery and Google OAuth if desired. Allow only exact student/admin redirect URLs. Verify reset/email/OAuth behavior against real accounts.
3. Create the owner's auth account. In the protected SQL editor, insert its exact verified UUID into `admin_memberships` with role `owner`. Do not bootstrap roles from email domains or mutable user metadata. Do not grant staff through the browser.
4. Verify two real learner accounts: cross-read/write denial for all personal tables; direct REST membership escalation denied; expired/anonymous sessions denied; reviewer cannot publish/suspend/promote; admin cannot read unrelated chat via student endpoints. Local tests do not replace these checks.
5. Validate concurrent checkpoints from two devices, lost-response idempotency, optional chat history/export/delete, reports and staff audits through deployed APIs.

Sensitive account deletion is a manual operator workflow: verify the requester's identity, export/backup if appropriate, delete that exact Auth user with authorized project tooling, verify cascade of private learner records, and resolve the deletion report. Never acknowledge deletion before it actually completes. Operational audit records referencing staff IDs require deliberate retention handling; do not blindly delete staff with audit references.

## Cloudflare

The candidate `engjatra.pages.dev` is not reserved or verified. Use owner-approved available projects; remain on Free plans. No deployment, DNS claim or billing change was made by this task.

Create two Pages projects with repository root as build root:

| Project | Build command | Output |
| --- | --- | --- |
| Student | `npm ci && npm run content:export && npx vite build --config apps/student-web/vite.config.ts` | `apps/student-web/dist` |
| Admin | `npm ci && npm run content:export && npx vite build --config apps/admin-web/vite.config.ts` | `apps/admin-web/dist` |

Set Node 24.19.0 and the public settings above. Do not use `--mode demo` for a Pages deployment. Both artifacts include SPA redirects, CSP, frame denial, no microphone/camera permissions, and self-hosted fonts. For a custom Worker domain, explicitly add that HTTPS origin to `connect-src` in `scripts/security-headers.txt` before the reviewed build. The standard `.workers.dev` deployment is already allowed; wildcard Supabase connectivity does not authorize data access.

Deploy the Worker separately only after owner approval: `npx tsx scripts/wrangler.ts deploy --config workers/api/wrangler.toml`. Configure real non-secret bindings and server secrets through Cloudflare before enabling service. `npm run build` uses `--dry-run` only. Do not route static content through Worker requests; the student artifact serves versioned JSON directly. Keep `LOCAL_DEMO` absent and `ENVIRONMENT=production`.

Verify auth redirects, SPA refresh, actual CSP headers, both site's routes, 401/403 negatives, static caching, reports, all hash checks and quota behavior on deployed origins. Use `npm run smoke:live` with an operator-provided learner token through secure environment injection (`ENGJATRA_LIVE_API`, `ENGJATRA_SMOKE_TOKEN`); it performs read-only negative checks, never prints the token, and does not substitute for the complete live QA matrix.

## Publishing corrections and rollback

1. Editor validates the learner preview and saves a private draft. Reviewer adds private notes/workflow state. Export public-safe patches from the admin app to an ignored `*.local.json` file.
2. Build both sites and audit. Generate a new immutable version in a NEW artifact directory:
   `npm run release:export -- /path/to/engjatra-release.local.json 3.0.1 /tmp/engjatra-release-3.0.1`
For subsequent releases, pass the archived currently published artifact as the fourth argument, for example `npm run release:export -- changes.local.json 3.0.2 /tmp/engjatra-release-3.0.2 /path/to/archived-3.0.1`. This uses the current published manifest/baseline, preserves all earlier immutable content, and combines it with the fresh application build. Never use a stale baseline or redeploy a plain initial build over an already published content revision.
3. The script rejects stale base releases, invalid structures/keys/permutations and private fields. It preserves prior versions and prints the new manifest SHA-256. Register the release as awaiting deploy in admin. No button claims this has deployed.
4. Owner deploys that reviewed student artifact with an authorized Pages deployment. Retain the exact artifact and previous deployment for rollback. Admin's verification runs four requests; each checks the deployed manifest and 24 unit hashes. Only after all succeed, record the verified release in protected owner SQL:
   `update public.content_releases set state='deployed' where id='<verified-version>' and manifest_sha256='<verified-digest>';`
   Append a corresponding owner audit entry with the verified owner's UUID and deployment identifier in the operational record. Do not record unverified deployment.
5. Rollback requests are audited. The owner restores the previous deployment/manifest while retaining immutable content directories, verifies its hashes, then records the actual outcome. Learner progress stays intact; stable IDs must not be reassigned to unrelated learning goals.

## External gates still to execute

Real Supabase Auth/PostgREST/RLS and cross-device tests; real Cloudflare Pages/Worker deployment and headers; Gemma and Llama account eligibility, response formats, model IDs and error/quota proof; available subdomains; legal/privacy/minor policies; bilingual semantic/teacher review and tests with real Bangla-speaking beginners; real mobile/slow-network measurements; backup/restore and capacity alerts on the owner's Free accounts. None is reported passed locally.
