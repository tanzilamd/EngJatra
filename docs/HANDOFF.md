# Maintainer handoff

## Current Bangladesh-only release candidate — 2026-10-10

- [x] Owner confirmed operator 18+, Bangladesh account, Bangladesh-only public AI, and accepted unpaid input/output processing for improvement and possible human review. No new key or account permission is needed for the existing publisher.
- [x] Commit `952bfa346797a3baf8f111837c9997af8a182abd` passed core QA/deployment/public browsers/controlled real Auth and cleanup in [Actions 38062732450](https://github.com/tanzilamd/EngJatra/actions/runs/38062732450). The isolated probe failed schema validation, so the **overall run failed** despite the verified core deployment. Independent all-target version/artifact/security verification matched 952bfa; Google stayed disabled.
- [x] Preserve strict response validation and require the actual expected correction for the fixed synthetic sentence (never exact-string grade arbitrary learner writing); clarify all seven JSON fields/array/enums/null and redact rejected-field diagnostics. Opt-in samples contain only validated responses to two fixed authored inputs, never learner text/raw invalid output/reasoning. Full schema-candidate QA passed 130 unit/API/PostgreSQL tests, 39 browsers and one release test before the final regional release edits.
- [x] Prepare source-owned exact Gemma 4 model / BD-only / eligible free flag in the sole CI publisher, with two-case actual inference preflight **before any upload**. Existing protected key stays server-side. Historical dashboard policy variables are superseded; settings writes remain denied but do not block this source-controlled operation.
- [x] Add regression-covered live-evidence classification: actual excluded-country denial is security evidence only; allowed-country denial or provider/schema failure still fails. Production tutor UI states Bangladesh/18+ scope. No QA country exception, identity collection, paid service, content release, migration or real owner mutation.
- [x] Fresh unchanged-source full local QA passed 132 unit/API/PostgreSQL tests, 39 browsers and one retained-release test. Updated tutor mobile/desktop screenshots were inspected in both themes; format, zero-vulnerability audit, workflow syntax/isolation and documentation checks passed. Final QA-only semantic guard/docs edits then passed all 133 unit/API/PostgreSQL tests, lint/types/format/docs, all three offline dry runs and actionlint. The committed source still requires fresh complete CI proof; no earlier proof is reused.
- [ ] Push directly to main and monitor preflight/publication. If provider output fails, stop before publication and use only safe field diagnostics to investigate; preserve the independently usable current release.
- [ ] Inspect actual validated bilingual synthetic responses; after publication verify all targets/core browsers/Auth/security and distinguish regional denial from inference.
- [ ] Verify the allowed tutor journey from an actual signed-in adult Bangladesh browser. The existing overseas runner cannot certify that path; do not spoof Cloudflare metadata or expand the scope.

Content 3.0.1, all 96 units, prior learner records, permanent owner and RLS remain preserved. Existing external inbox/Google consent, physical-device, legacy migration/restore provenance and independent editorial/source-rights evidence remain separate. Previous checkpoints below are historical; this section governs current scope/status.

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

## Verified source-tooling delivery checkpoint

Commit `2ede5f4961131c8575e3e535407a965e88b8cede` passed [Actions 38041847384](https://github.com/tanzilamd/EngJatra/actions/runs/38041847384), including full 117-test / 37-browser / one-release QA, actual public browsers and real disposable Auth/progress/admin/RLS checks. Independent live verification matched all three active versions and artifacts; remote main matched and the tree was clean. Content remains 3.0.1, the permanent owner is preserved, publication metadata is deployed, and no QA identities remain. Both provider flags and production demo mode are false. The existing Gemma key is retained securely in Actions and authenticated model metadata; the disabled production Worker currently has no Gemma secret binding. The established publisher adds that binding only for a future eligible activation. No additional key is needed now.

This documentation-only checkpoint must pass its own normal main pipeline; inspect that latest run rather than redoing the source milestone. Remaining independent gates and editorial coverage are listed at the top of STATUS; do not replay initial SQL, falsify missing history, migrate AI providers or enable Google-hosted generation for mixed ages under the observed terms.

## Current adult-only continuation supersedes prior audience decision

Read the new STATUS milestone first. Latest owner instruction changes distribution to 18+ exclusively. The earlier mixed-age hold is historical; operator/account/region and unpaid-data requirements remain unverified. Preserve Google primary and free-only existing fallback. New consent/private-input/regional guards, stricter bilingual contract, safe loading/retry, and conditional pre-deploy plus authenticated post-deploy inference checks are implemented but need fresh full QA/production evidence before completion. `GEMMA_ALLOWED_COUNTRIES` is required only when Google generation is enabled; no new key, billing, destructive migration or provider provisioning occurred. Existing 3.0.1/content/progress/owner records remain intact.

Candidate local evidence: full 123-unit / 39-browser / one-release QA passed before the last provider transport-only hardening; all 126 unit/API/RLS/security tests, lint/types, both builds/API bundle/artifact scans, formatting, zero-vulnerability audit and three dry runs then passed. Fresh tutor light/dark desktop/mobile and 320px Auth screenshots were inspected. The normal pipeline must generate final source/commit proof and deployed receipts; check latest main/run before deciding publication is pending. Operator eligibility question remains unanswered and no inference has been performed.

## Verified adult readiness and next nonpublishing check

Commit `8e0ef1b8055ea97f4c086110f28b1a96a9733b7c` passed Actions 38061072658, including fresh 126-unit / 39-browser / one-release QA, exact sequential deployments, public browsers and real Auth/progress/admin/RLS fixtures with cleanup. Independent artifact/security verification matched all three active versions. Public AI remains disabled. The operator has since confirmed age 18+ and operating account Bangladesh; distribution scope and unpaid-message processing acceptance are still pending.

The existing CI workflow now offers `verify_ai=true`: a serialized, synthetic-only job using the current protected Google key/model, without Cloudflare/Supabase credentials or publishing jobs. It runs exactly two authored synthetic inputs and archives only safe status/schema/correction evidence. An explicitly reviewed `[verify-ai]` main commit marker also selects the same synthetic job, without needing an additional Actions-write credential. Actual provider inference must be observed; preparation is not execution. Default main pushes retain all normal QA/publication gates. ISO-date practice is no longer rejected as a phone number; recognizable contact/secret filters remain heuristic and never certify anonymization.

The synthetic/date workflow candidate passed fresh full 126-unit / 39-browser / one-release local QA and actionlint across every workflow. Final provider-only refinement follows official Gemma 4 REST documentation: minimal reasoning for the two documented models, exclude thought parts, and emit only fixed stage/status diagnostics for failed synthetic checks. Run affected unit/types/lint/build/docs/format/security/dry-run checks and require fresh exact-source normal CI proof after the commit; do not reuse predecessor proof. New 8e0ef1b performance samples are at the top of STATUS.

Final affected checks passed all 127 unit/API/database tests, lint, types, both builds/API/artifact scans, format, zero-vulnerability audit, docs, three target dry runs and actionlint. The next reviewed commit carries `[verify-ai]` to execute the bounded synthetic job with existing push access; this avoids requesting a new private token or extra Actions-write scope. Its results and the normal exact-commit QA/deploy/live checks must be observed before completion. Public launch-country/unpaid processing approval remains pending.

Synthetic probe at commit `952bfa346797a3baf8f111837c9997af8a182abd`, Actions 38062732450, authenticated the configured model and reached real inference, but the first reply failed strict schema validation. Public AI stayed disabled; no raw invalid output or learner text was recorded. This is not successful tutor inference. The next candidate specifies all seven JSON fields and the exact array/enum/null types, exposes only allowlisted invalid-field diagnostics/attempt counts, and permits opt-in **validated replies to the two authored synthetic inputs** for English/Bengali quality inspection. Normal operational reports never include learner replies, provider envelopes, reasoning, secrets or invalid output. Recheck is bounded; actual results and all normal deployment gates remain required.
