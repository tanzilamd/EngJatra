# EngJatra development status — 2026-10-09

**Local application and reusable environment implemented and validated. Production and independent educational verification are not complete.** Fresh code was built from the current specifications and teaching data. No cancelled application code was imported.

## Feature evidence

| Area | Implemented and locally verified |
| --- | --- |
| Foundation | Node 24.19.0, React/Vite/strict TypeScript/Tailwind, one npm lockfile, modular packages, separate student/admin Static Assets Workers, CI, self-hosted Inter/Hind Siliguri, responsive Bangla brand UI |
| Student onboarding | Explicit demo, real Supabase email/signup/recovery/Google adapters, setup-required production state, first-start choice, optional formative placement, <=3-step skippable/replayable tour |
| Learning | All 96 units / six tracks; micro-lessons, authored reading, vocabulary, choices/cloze/detective, sentence tiles, matching, free writing self-review, scripted branches/continuations, formative checkpoints, external listening/speaking guidance |
| Supplemental content | All 932 canonical sense records, 132 grammar cards including 36 extra cards, 96 scripted conversations, 480 authored activities, 12 longer readings; report and suspension handling for library items |
| Progress | Completion separate from self-reported recall, saved words/due dates, spaced retrieval, recent mistakes, minimal bounded attempt summaries; checkpoint resume and online/offline/conflict states |
| Backend | Actual SQL schema, RLS on all application tables, remote user verification, DB-backed staff role checks, atomic revision/idempotency receipts, personal ownership, bounded report/AI/history APIs |
| Admin | Separate protected app, permission matrix, minimal support profiles, report resolution, revision-checked draft editing and learner preview, private reviewer notes/workflow, audited item suspension/reinstatement, release/rollback requests, observed usage counters |
| Release | Public-safe export, strict metadata scan, stale baseline rejection, new immutable artifact with old versions retained, four-batch deployed hash checks; owner-only deployment recording, no false publish toast |
| AI | Disabled-by-default Gemma and independently configured Groq Llama HTTP adapters, bounded short conversation context and structured replies, input/output/time limits, atomic free-use budgets, transient circuits, controlled failover and authored no-AI continuation |
| Privacy | No uploads/microphone, no public learner profiles, no frontend secret/admin payloads, optional bounded AI history, own export/history deletion, truthful verified-operator account-deletion request workflow |
| Production artifacts | Both sites build; Worker compiles/dry-runs; browser demo flags cannot bypass production; public-only shell/content cache never caches API/auth responses; CSP/header files generated; SPA routing in Worker config |

## Original implementation checks

The original build QA completed with exit code 0. These initial results are preserved below; the current deployment-audit evidence is recorded in the final section.

- `content:export`, Python handoff audit and extended `test:content`: PASS. Validated all counts, unit/activity identity, schemas, authored keys, token permutations, public metadata and lazy unit sizes (largest normalized unit under 10 KB).
- `lint` and strict `typecheck`: PASS.
- `npm test`: **55 tests passed across 5 files**, including actual local PostgreSQL migration/RLS functions via PGlite, negative ownership/admin permission tests, idempotency/conflicts, storage exhaustion, queued replay, AI healthy/fallback/timeout/invalid/free-disabled contracts, bounded release proof and publishable-key public REST authentication.
- `test:e2e`: **8 passed**, desktop and 320px mobile. Real browser first-lesson completion/free writing/AI outage/resume, all tracks and all 96 static fetches, supplemental grammar/readings, offline pending/reconnect, report-to-admin draft workflow, public export isolation, and axe accessibility checks.
- `build`: PASS for student and admin production artifacts and Cloudflare Worker `--dry-run`. Artifact scans found no demo authentication branches, private student metadata, secret patterns or public source maps.
- `test:production`: **4 passed**, desktop/mobile. Production refuses spoofed browser demo flags, missing auth fails closed, selected public content and shell work on offline reload, and no API responses enter the public cache. Production welcome axe checks passed.
- `test:release`: **1 passed**, exercising actual CLI export, retained previous assets, changed version/hash, and rejected private/stale edits. Successive-release baselines and preservation of all previous versions were also exercised. Its fixture directory was removed after validation; no release was deployed.

Failures found during development were corrected and affected checks rerun: accessibility landmark, retained demo callback code in production, Worker runtime handler signature, publishable-key handling for anonymous public REST requests, draft JSON/concurrency handling, SQL ambiguous identifier, local Wrangler config path, and browser selector mistakes. Passing structural/browser checks does not establish semantic content accuracy or eliminate every possible defect.

Local PostgreSQL tests use the real migration plus a test-only Supabase `auth.uid()` shim. They are not a live Supabase Auth/PostgREST/RLS or OAuth test. Local API fixtures and mocked provider replies are not production integration. CI configuration exists but GitHub Actions has not run remotely in this task.

## Repository cleanup QA — 2026-10-09

Reviewed both completed build prompts against all permanent documents, preserved durable guidance, then removed them. The combined prompt's master and twelve attachments matched their standalone files exactly. Updated maintainer instructions for the accepted implementation, the Bangla startup guide, historical build/baseline labels and the older Supabase public binding name. No application, UI, teaching content, branding or database changes were made.

After cleanup, `npm run qa` completed with exit code 0: 55 unit/API/database tests, eight demo browser tests, four production browser tests and one release test passed; content integrity, lint/types, both production builds, Worker dry-run and public security scans passed. `npm run test:docs` checked all 24 Markdown files for local links/specifications, npm scripts, public environment names and retired prompt references. `npm run format:check` passed; full and production-only npm audits reported zero vulnerabilities. A recognizable private-key/token scan passed over 202 repository text files without printing values. These checks do not prove absence of every security defect or verify external integrations.

## External activation and verification still required

| Gate | Precise dependency / next action |
| --- | --- |
| Supabase Auth, PostgREST, live RLS and cross-device sync | Owner-approved Free project, apply reviewed migration, configure exact public URL/key and Auth redirects; test two real accounts and expiry/negative permissions |
| Cloudflare three Workers and Actions | Owner-approved account/token/GitHub config, real origins and pipeline execution, verified headers/routing; no deployment or DNS claim made |
| Eligible Gemma/Llama integration | Secure server keys, exact current supported model IDs, account-specific free eligibility/privacy/quotas; keep free switches false until confirmed; no billing enabled |
| Current official provider/account verification | Initial requests were denied; current audit could read public Google/Groq documentation. Account access, eligibility, quotas and live calls remain unverified. Saved network draft additions still require publication; saving is not runtime enforcement |
| Real learner/semantic/legal verification | Bangla-speaking beginner sessions, independent bilingual/editorial review, teaching-band adequacy, source rights, privacy/minor/legal review and actual mobile/slow-network pilot |
| Account operations | Owner UUID/bootstrap, verified support deletion/role changes, backup/restore, actual storage/egress/provider alerts and Free-plan safeguards |

See `CONTENT_GAPS.md` for the precise supplied-data limitations. No credentials were requested in chat, fabricated, or committed. No live provider, public deployment, CEFR attainment or expert verification is claimed.

## Reproduction and next task

Clean `npm ci` plus the saved installation checks were rerun successfully. Run `npm ci`, `npm run dev`, then `npm run qa`. Individual release/production validation requires current `npm run build` artifacts. For actual integration, read `CREDENTIALS_AND_DEPLOYMENT.md` and use secure settings, not code/chat values. No additional feature implementation is being concealed as a credential gate; remaining production and educational checks above need those real prerequisites.

Reusable `install_script` and `start_skill` were saved in the cloud configuration draft, replacing the earlier content-only setup instructions. Official documentation/API domains were added to that draft while preserving package-manager presets. They have not been published or proven applied in a new task.

The initial implementation and cleanup used `work`. The latest owner instruction supersedes that workflow: routine work now uses synchronized main directly, without branches/PRs. Git history confirms the initial work was merged into main by commit `783c933` (PR #1). Publication and live activation still require independent verification. No production migration, deployment, DNS claim or paid configuration was performed. Review the implementation and test evidence before a separately authorized deployment.

## Historical GitHub synchronization — earlier 2026-10-09

Repository: https://github.com/tanzilamd/EngJatra. Pushed the completed implementation (`7ab1755`) and documentation/prompt cleanup (`1ceef76`) through the connected Git transport to `origin/work`. `git ls-remote` verified the remote branch SHA exactly matched the local cleanup commit; `main` remains at `ed0b830`. No force-push or branch deletion was used. This status update is a separate follow-up documentation commit.

PR creation is blocked by this environment's GitHub API access: `gh pr create` returned `Post "https://api.github.com/graphql": Forbidden`; repository API reads were also denied. `gh auth status` reports the injected `GH_TOKEN` as invalid. Successful Git transport is not proof of working API authentication. No PR success or remote CI pass is claimed.

This historical PR retry guidance is superseded: Git history now shows the work merged, and routine sessions use main directly. The previous CLI/API denial does not undo the verified Git push.

## Current environment/deployment audit — 2026-10-09

Fetched origin/main and continued the accepted implementation on main, preserving its UI, brand, content and RLS. Added explicit student/admin Static Assets targets, matching API config/date, main-only serialized Actions, actual readiness/deploy/verify scripts, source/commit QA evidence, additive protected secrets, configured CSP, retained immutable content and bounded remote verification. Corrected blank API defaults, missing-allowlist failure handling, and an artifact scan that incorrectly treated public legacy anon JWTs as private tokens.

Authoritative new docs: `docs/ENVIRONMENT_VARIABLES.md` (all actual values, phases/source/destination/status, OAuth/SMTP and environment boundaries) and `docs/DEPLOYMENT_SIMPLE_BN.md` (one-time owner checklist). Original current operational docs now use three Workers and direct-main workflow. No routine PR is needed. Historical synchronization above describes the prior task only.

Final expanded `npm run qa` completed with exit code 0: **74 unit/API/database/deployment tests across six files**, **8 demo journey browser tests**, **4 fail-closed production browser tests**, **4 actual Wrangler Static Assets desktop/mobile browser tests**, and **1 release test** passed. This includes real local PostgreSQL migration/RLS execution with an auth shim, all six bands and 96 units, accessibility, content/key/metadata checks, lint, strict types, both production site builds, API compilation, artifact security scans and source-stability QA evidence. `npm run format:check`, `npm audit` (zero vulnerabilities), Actions `actionlint`, and `npm run deploy:check -- --offline` (three target dry runs) also passed. Documentation consistency checked all 26 Markdown files and is rerun after this status update.

The configured CLI was also exercised with **fixture-only** public configuration and a private test sentinel: all three Wrangler targets compiled, no service was published, the sentinel was absent from console logs, and the temporary secret file was removed. Actual unconfigured `deploy:check` and `deploy:all` both rejected missing required inputs before remote mutation. A recognizable private-credential scan passed across 217 repository text files without printing values. `npm run smoke:live` correctly returned `NOT RUN` / exit 1 because the actual API origin and short-lived learner token are unavailable.

Two audit-test defects were fixed and rechecked: a plain JSON reader rejected valid Wrangler JSONC trailing commas (now parsed as JSONC), and an overly specific verification-request-count assertion was replaced by checks for all 96 units and six libraries. Final checks have no unresolved local failures. These tests do not prove cloud deployment, real authentication or absence of every security defect.

No Cloudflare token/account ID, Supabase key, AI keys or real app origins are ready in this Codex runtime; outbound identity manifest is empty. External dashboards/values are not accessible, not assumed blank. Named project health request was denied by the proxy. Public official Cloudflare configuration, Google Gemma API/pricing and Groq model docs were accessible; observed model IDs/pricing do not prove account eligibility or successful calls. Brevo guidance access was denied. Both free flags remain false.

The environment draft preserves existing destinations/presets and adds api.cloudflare.com, api.github.com and the supplied Supabase project; the startup skill now reflects main and Worker automation. Saved with requires_publish=true; no policy enforcement or secret forwarding is claimed. Native build disconnection, deployment credentials, migration/Auth/OAuth/SMTP configuration, actual live URLs and AI/real learner/legal tests remain owner/external gates. Local fixes are implemented; no live deployment or migration was performed.

## Verified main synchronization and remote pipeline evidence

Commit `e13dd49c30fdbd519ffb108d7f12549e50e7caff` was pushed directly to main; `git ls-remote` independently verified the identical remote SHA. No force-push, PR or unrelated branch change occurred. GitHub Actions run [37962421632](https://github.com/tanzilamd/EngJatra/actions/runs/37962421632) matches that commit: **QA succeeded**, including the full QA/format/audit command and all three offline dry runs. **Deployment failed at `deploy:check -- --configuration-only` (exit 1); upload/deploy steps were skipped.** It did not publish services.

GitHub API access now permits Actions run/step/annotation reads, superseding the earlier general API denial. Variables/Secrets administration reads still return `403 Resource not accessible by integration`; production environment reads returned 404 (absent or inaccessible). Workflow log downloads are denied by the session proxy, so the exact remote readiness error could not be retrieved from that run; do not infer dashboard values from it. A follow-up adds **redacted deployment failure annotations**, allowing readiness diagnostics through the permitted checks API even when log storage is blocked. Its full local QA rerun passed again (74 unit/API/database/deployment, 16 browser and one release test), as did format, zero-vulnerability npm audit and workflow actionlint. A fixture-only CLI check confirmed correctly escaped annotation output without credential leakage or publication; documentation consistency was rerun after this evidence update. The final task report and main history identify the latest follow-up commit and push verification.
