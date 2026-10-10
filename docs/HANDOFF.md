# Maintainer handoff

Read `AGENTS.md`, `STATUS.md`, `DECISIONS.md`, `ENVIRONMENT_VARIABLES.md`, then relevant specifications. This application was written fresh. The handoff baseline documents describe the original data audit, not the implemented runtime.

## Runtime boundaries

Student and admin each have their own Vite root and build artifact. Production assets contain no local demo authentication branch. The Worker additionally requires BOTH the explicit local bindings and a loopback request hostname before accepting mock identities. Production ignores local identity headers and calls Supabase `GET /auth/v1/user`, then reads DB-backed admin membership. Frontend state and user metadata never establish staff authority. No service-role key is used in the application.

Normal development is `npm ci`, `npm run dev`. A task is already isolated: use the existing checkout rather than creating a worktree unless requested. Restart all three processes in new environments; live processes are not snapshot artifacts. Wrangler writes its configuration and logs under the ignored repository `.wrangler` path through the portable Node wrapper, not a privileged home directory.

## Content and lessons

`content/units-public` is normalized into a strict allowlisted student schema. Six library chunks include all 132 grammar cards (36 supplemental), 932 sense records, 96 scripted conversations, 12 extended readings, formative checkpoints and official external practice links. Units are fetched individually. No entire source bank is bundled into startup JavaScript. Stable IDs, teaching bands and answer keys are checked; writing remains rubric/self-review, never binary string grading. Level track completion is distinct from skill mastery and certification.

An open lesson pins its content release; starting a new lesson at step zero uses the current manifest. Releases must retain previous immutable unit directories for cached/in-progress sessions. A public-safe blocklist exposes item IDs only. Unit fetch checks it before showing content; suspension applies on the next unit fetch, not via a promised real-time push. Online unit/library reads always refresh the suspension list and fail closed on server failure. Offline reads require a last-observed public ID-only list for the same API/mode within 24 hours; missing/stale/malformed snapshots fail closed. Already-open authored practice can continue through an interruption. Reconnection checks current suspension IDs on the next load.

Student is an installable PWA with a manifest, 192/512px icons, a safe-zone maskable icon and Apple touch icon. `scripts/pwa-build.ts` emits the sole `/sw.js`, pins its shell cache to emitted HTML, and precaches entry/workspace, CSS, fonts and install assets. Fingerprinted assets and immutable lessons are cache-first; the teaching manifest and clean navigation shell are network-first. Public content is bounded to 180 files; cache quotas can evict files, so offline access is conditional, not guaranteed. API, auth, cross-origin, non-GET and query-bearing requests never enter caches. The legacy cache migrates only clean public content and is removed; progress/session storage is untouched.

Updates wait for an explicit learner action; the action is disabled during an active lesson to protect unfinished responses. Keep one prior app shell for active tabs; never force a mid-lesson reload or delete progress. New optional chunks require a previous visit or connection. Fresh login, first load, uncached lessons, AI and account operations need connectivity. The ID-only suspension snapshot permits previously cached lessons for at most 24 hours after observation; it never makes online API errors silently succeed.

The install surface appears only after onboarding/tour engagement and a genuine browser prompt (or iOS guidance). Dismissal lasts 14 days, standalone sessions never show it, and unsupported browsers get no false install action. iOS instructions use Safari Share → Add to Home Screen; actual browser permission and physical installation are browser/user-controlled. Theme and install preferences are separate from learner progress. Native Dialog and shared SessionProvider centralize focus/Auth behavior; do not recreate duplicated session requests or service workers. See BRAND_DESIGN.md for permanent UI rules.

## Persistence

`SyncEngine` retains a last confirmed server snapshot separately from pending local state, with a stable UUID idempotency key. On reconnect it replays the request. Revision conflicts merge completions, saved words and minimal attempts, keep the latest local cursor, and retry against the returned server revision. Concurrent edits of the same word prefer local state; this is practice data, not an assessment record. Do not claim automatic semantic conflict resolution for editorial content; drafts use explicit revision checking.

The PostgreSQL checkpoint transaction locks the user's path, checks ownership and limits, records a receipt, updates summary state and normalized learning rows together. Attempt summaries contain stable IDs and outcome only, not answers. Writing outcome is null. Browser state keeps the latest 300 summaries; DB detail retains at most 1,000 or 60 days per user. Completions are permanent until account deletion. AI history is optional, capped at 100 conversations, ten conversation headers per page, and user-clearable without deleting learning progress. No automatic paid expansion or hidden progress deletion.

The local mock service is intentionally ephemeral and distinct from a real Supabase account. Two seeded learners are available to API tests; staff roles are opt-in local fixtures. PGlite executes the actual SQL migration and role/RLS behavior with a test-only `auth.uid()` shim. It validates PostgreSQL policies and functions, not real Supabase OAuth, PostgREST or cross-device cloud connectivity.

## API

All mutation JSON is bounded and schema-validated. Authentication uses bearer sessions, allowed origins and no cookie-based admin authority.

| Endpoint                                                 | Access / behavior                                                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/api/health`                                            | Public availability marker, no credentials                                               |
| `/api/content/blocked`                                   | Minimal public item ID list; actor columns are not granted publicly                      |
| `/api/learning/snapshot`                                 | Authenticated current revision and personal state                                        |
| `/api/learning/checkpoint`                               | Authenticated bounded revision/idempotency transaction; 409 includes own server snapshot |
| `/api/reports`                                           | Own report; ten per hour in DB; staff resolution is audited                              |
| `/api/ai/tutor`                                          | Own authenticated unit-scoped text, bounded free-only routing and authored fallback      |
| `/api/history`                                           | Own paginated history; DELETE removes own optional chats                                 |
| `/api/history/:id`                                       | Own bounded messages; cross-account filter + RLS                                         |
| `/api/account/export`                                    | Own personal tables only; no editorial records                                           |
| `/api/admin/session`, `/overview`, `/drafts`, `/content` | DB role required                                                                         |
| `/api/admin/draft`, `/review`, `/report`                 | Explicit editor/reviewer role and revision validation                                    |
| `/api/admin/block`, `/release`, `/rollback`              | Admin/owner only; audited                                                                |
| `/api/admin/export`                                      | Editor+; strict public-safe patch artifact, no notes/status                              |
| `/api/admin/verify`                                      | Admin/owner; four batches verify manifest plus 24 unit hashes each                       |
| `/api/admin/support`                                     | Admin/owner; minimal profile ID/alias only, no learner chat                              |

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

## Same-zone content transport

The API fetches public teaching assets from the student Worker. Both checked-in and generated API Wrangler configurations require `global_fetch_strictly_public`; otherwise Cloudflare can route same-zone fetches away from the target Worker or reject them (documented error 1042). Readiness rejects a missing flag. This uses the existing public static origin, adds no secret/service, and preserves all staff/Auth/CORS checks. Protected preview must be tested live; a publicly reachable JSON URL alone does not prove Worker-to-Worker transport.

## Launch Auth and provider verification

The public Auth view paints before the asynchronously initialized, single Supabase SDK client is ready; actions stay disabled with a connection status. Stored sessions and token callbacks remain behind the session loader. The SW precaches both root lazy imports (workspace and SDK) and registers after load/idle, with a bounded fallback. Never add another client/subscription or lose SDK caching on offline reload.

Email/password confirmation is provider-enforced and checked in frontend/server defense in depth. Pending signup clears the password, offers resend with a 60-second **local request pace** (not a claimed provider reset), generic 429/failure feedback and email correction. Google uses Supabase's provider-confirmed email and needs no separate mail. Callback errors show safe expiry/reuse guidance; password recovery updates through the provider, then explicitly signs out locally and returns to login. `supabase/templates/` contains branded Bengali mail templates; `auth:audit -- --apply-templates` is a narrow operator configuration update, not proof of delivery.

`ai:check` runs in the existing deployment job, reads configured Gemma model metadata with the existing masked Actions secret and archives only safe booleans/model/status. It never generates while eligibility is disabled and cannot read account billing/quota ownership from metadata. It creates no competing publisher. Current Google terms and free processing disclosures are in AI_TUTOR and SECURITY_PRIVACY.

## Resume after launch hardening

Code `6ba21340ec696e6f0283164dec08effc76eb9c8a` deployed successfully in Actions 38038409096. Independent live artifact/public-browser/controlled Auth tests passed; two fixture users were deleted. Startup performance and exact remaining external gates are in STATUS. Google-hosted Gemma remains disabled for the confirmed mixed-age audience; keep Google AI Studio, do not migrate.

Teaching supplements now use append-only `content/releases/`, through the existing build/publisher/retained-artifact guard. Original 3.0.0 assets survive; 3.0.1 adds 36 translations, seven examples and two narrow caveat corrections with unchanged units/progress keys. Collection release is separate from pinned unfinished-lesson state. Review `tests/library-release.test.ts`, the collection browser regression and dynamic-baseline release test before future updates. No production SQL, publishing-state claim or privileged owner impersonation accompanies static source publication.

## Completed teaching publication and future edits

Code release `759f858f0d71ef12de92a6795d65414f77a07b35` passed Actions 38040248069 and independent live version/artifact/security/Auth/progress/admin/RLS checks. Content 3.0.1 is hash-verified and recorded in protected release history with an explicit owner-authorized Codex operator audit; this adds only truthful publication metadata, not migration history or a real owner login. Both QA fixtures were removed. STATUS records final serial performance.

`release:prepare` converts a reviewed protected unit export into a strict public `content/releases/<new-version>.json`, anchored to the verified baseline hash and preserving activity/saved-word IDs. Source release tooling is in `scripts/content-releases.ts`; never rewrite original source/export 3.0.0 or published release files. Commit the reviewed new file after QA; Actions remains the sole publisher. `release:export` can separately preview an artifact. Prepare/source checks do not imply teacher approval or deployment, and publication metadata is recorded only after live hash verification.
