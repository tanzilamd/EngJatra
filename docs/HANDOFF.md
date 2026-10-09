# Maintainer handoff

Read `AGENTS.md`, `STATUS.md`, `DECISIONS.md`, `ENVIRONMENT_VARIABLES.md`, then relevant specifications. This application was written fresh. The handoff baseline documents describe the original data audit, not the implemented runtime.

## Runtime boundaries

Student and admin each have their own Vite root and build artifact. Production assets contain no local demo authentication branch. The Worker additionally requires BOTH the explicit local bindings and a loopback request hostname before accepting mock identities. Production ignores local identity headers and calls Supabase `GET /auth/v1/user`, then reads DB-backed admin membership. Frontend state and user metadata never establish staff authority. No service-role key is used in the application.

Normal development is `npm ci`, `npm run dev`. A task is already isolated: use the existing checkout rather than creating a worktree unless requested. Restart all three processes in new environments; live processes are not snapshot artifacts. Wrangler writes its configuration and logs under the ignored repository `.wrangler` path through the portable Node wrapper, not a privileged home directory.

## Content and lessons

`content/units-public` is normalized into a strict allowlisted student schema. Six library chunks include all 132 grammar cards (36 supplemental), 932 sense records, 96 scripted conversations, 12 extended readings, formative checkpoints and official external practice links. Units are fetched individually. No entire source bank is bundled into startup JavaScript. Stable IDs, teaching bands and answer keys are checked; writing remains rubric/self-review, never binary string grading. Level track completion is distinct from skill mastery and certification.

An open lesson pins its content release; starting a new lesson at step zero uses the current manifest. Releases must retain previous immutable unit directories for cached/in-progress sessions. A public-safe blocklist exposes item IDs only. Unit fetch checks it before showing content; suspension applies on the next unit fetch, not via a promised real-time push. A failed overlay fetch fails the new unit closed; already open authored practice can continue through a connection interruption.

The public-only service worker caches same-origin shell/assets/content on visits. It never caches API, auth or private account responses. First load and starting an uncached unit need connectivity. Offline caching does not override an unavailable suspension check. Do not market complete offline first-load or offline cloud auth.

## Persistence

`SyncEngine` retains a last confirmed server snapshot separately from pending local state, with a stable UUID idempotency key. On reconnect it replays the request. Revision conflicts merge completions, saved words and minimal attempts, keep the latest local cursor, and retry against the returned server revision. Concurrent edits of the same word prefer local state; this is practice data, not an assessment record. Do not claim automatic semantic conflict resolution for editorial content; drafts use explicit revision checking.

The PostgreSQL checkpoint transaction locks the user's path, checks ownership and limits, records a receipt, updates summary state and normalized learning rows together. Attempt summaries contain stable IDs and outcome only, not answers. Writing outcome is null. Browser state keeps the latest 300 summaries; DB detail retains at most 1,000 or 60 days per user. Completions are permanent until account deletion. AI history is optional, capped at 100 conversations, ten conversation headers per page, and user-clearable without deleting learning progress. No automatic paid expansion or hidden progress deletion.

The local mock service is intentionally ephemeral and distinct from a real Supabase account. Two seeded learners are available to API tests; staff roles are opt-in local fixtures. PGlite executes the actual SQL migration and role/RLS behavior with a test-only `auth.uid()` shim. It validates PostgreSQL policies and functions, not real Supabase OAuth, PostgREST or cross-device cloud connectivity.

## API

All mutation JSON is bounded and schema-validated. Authentication uses bearer sessions, allowed origins and no cookie-based admin authority.

| Endpoint | Access / behavior |
| --- | --- |
| `/api/health` | Public availability marker, no credentials |
| `/api/content/blocked` | Minimal public item ID list; actor columns are not granted publicly |
| `/api/learning/snapshot` | Authenticated current revision and personal state |
| `/api/learning/checkpoint` | Authenticated bounded revision/idempotency transaction; 409 includes own server snapshot |
| `/api/reports` | Own report; ten per hour in DB; staff resolution is audited |
| `/api/ai/tutor` | Own authenticated unit-scoped text, bounded free-only routing and authored fallback |
| `/api/history` | Own paginated history; DELETE removes own optional chats |
| `/api/history/:id` | Own bounded messages; cross-account filter + RLS |
| `/api/account/export` | Own personal tables only; no editorial records |
| `/api/admin/session`, `/overview`, `/drafts`, `/content` | DB role required |
| `/api/admin/draft`, `/review`, `/report` | Explicit editor/reviewer role and revision validation |
| `/api/admin/block`, `/release`, `/rollback` | Admin/owner only; audited |
| `/api/admin/export` | Editor+; strict public-safe patch artifact, no notes/status |
| `/api/admin/verify` | Admin/owner; four batches verify manifest plus 24 unit hashes each |
| `/api/admin/support` | Admin/owner; minimal profile ID/alias only, no learner chat |

## AI

Google generateContent and Groq OpenAI-compatible HTTP adapters are implemented behind one validated response contract. No model ID is assumed eligible. Both free-confirmed switches default off; model names and keys must be verified by the operator. A call caps output at 500 tokens, input at 1,500 characters, timeout at ten seconds. There is at most one call to each provider; transient primary errors permit independent fallback. Per-isolate transient circuits last 30 seconds. Across instances, PostgreSQL atomically limits each user to four requests/minute and 20/day, and all users to 200/day. Daily counters use UTC. Provider quota 429 is kept unknown without documented proof; no reset clock is fabricated. Circuit state is an optimization, not the shared quota security boundary.

Provider health rows have no fabricated samples. Operational counts come from DB counters; account dashboards remain the source for actual provider/Cloudflare/Supabase capacity. Exact provider docs, model availability and free terms need current account verification before enabling live AI.

## Releases and security

Staff edits remain private DB drafts. Reviewers can annotate workflow state; this never establishes teacher review or deployment. Editors export normalized public patches. The CLI builds a separate site artifact retaining old versions. An approved owner deploys it, verifies all hashes in four batches (keeps requests below the free Worker subrequest ceiling), and records the deployment using protected owner SQL. Authenticated RPC clients have no action that can mark deployed state. Rollback is an audited request followed by actual manifest/site restoration and hash verification, not an automatic fake success.

For a migration change, add a new forward-only file after the initial migration is applied; never edit an already-applied file. Fresh-schema tests execute migrations in lexical order. Production permission, rollback, deletion and role-grant operations require operator identity verification, backups, and the explicitly approved project. There are no arbitrary uploads or paid-service paths.

## Main and delivery automation

Maintain synchronized `main` directly for routine work; no routine feature branches or PRs. The owner authorizes main pushes and the configured Free deployment pipeline, never force-push/protection bypass, destructive migrations, DNS claims or paid upgrades. `.github/workflows/ci.yml` is the sole deployment mechanism. Disable matching native Cloudflare Builds.

Three targets: root `wrangler.jsonc` → `engjatra` student Static Assets; admin config → `engjatra-admin`; API TOML → `engjatra-api`. No frontend script/runtime secret or API upload to the student target. Generated API config is ignored/validated; preserve-vars plus additive secrets prevents blank binding deletion. Public Vite fields exist at build time; Supabase OAuth/SMTP belong in its dashboard. Read `docs/DEPLOYMENT_SIMPLE_BN.md` for one-time setup.

QA fingerprints the tested commit/source. A deploy requires current proof (reruns QA otherwise), then configured build/scans/three dry runs, remote backend/account preflight, explicit sequential uploads and current version tags plus actual artifact hashes/security. Previous verified static artifacts retain old immutable content; missing archives/version conflict fail closed. This remains local-tested automation until actual Actions/account/services are verified.
