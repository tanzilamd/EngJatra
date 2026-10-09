# EngJatra development status — 2026-10-09

**Local application and reusable environment implemented and validated. Production and independent educational verification are not complete.** Fresh code was built from the current specifications and teaching data. No cancelled application code was imported.

## Feature evidence

| Area | Implemented and locally verified |
| --- | --- |
| Foundation | Node 24.19.0, React/Vite/strict TypeScript/Tailwind, one npm lockfile, modular packages, separate student/admin sites, CI, self-hosted Inter/Hind Siliguri, responsive Bangla brand UI |
| Student onboarding | Explicit demo, real Supabase email/signup/recovery/Google adapters, setup-required production state, first-start choice, optional formative placement, <=3-step skippable/replayable tour |
| Learning | All 96 units / six tracks; micro-lessons, authored reading, vocabulary, choices/cloze/detective, sentence tiles, matching, free writing self-review, scripted branches/continuations, formative checkpoints, external listening/speaking guidance |
| Supplemental content | All 932 canonical sense records, 132 grammar cards including 36 extra cards, 96 scripted conversations, 480 authored activities, 12 longer readings; report and suspension handling for library items |
| Progress | Completion separate from self-reported recall, saved words/due dates, spaced retrieval, recent mistakes, minimal bounded attempt summaries; checkpoint resume and online/offline/conflict states |
| Backend | Actual SQL schema, RLS on all application tables, remote user verification, DB-backed staff role checks, atomic revision/idempotency receipts, personal ownership, bounded report/AI/history APIs |
| Admin | Separate protected app, permission matrix, minimal support profiles, report resolution, revision-checked draft editing and learner preview, private reviewer notes/workflow, audited item suspension/reinstatement, release/rollback requests, observed usage counters |
| Release | Public-safe export, strict metadata scan, stale baseline rejection, new immutable artifact with old versions retained, four-batch deployed hash checks; owner-only deployment recording, no false publish toast |
| AI | Disabled-by-default Gemma and independently configured Groq Llama HTTP adapters, bounded short conversation context and structured replies, input/output/time limits, atomic free-use budgets, transient circuits, controlled failover and authored no-AI continuation |
| Privacy | No uploads/microphone, no public learner profiles, no frontend secret/admin payloads, optional bounded AI history, own export/history deletion, truthful verified-operator account-deletion request workflow |
| Production artifacts | Both sites build; Worker compiles/dry-runs; browser demo flags cannot bypass production; public-only shell/content cache never caches API/auth responses; CSP/redirect/header files generated |

## Executed checks

The full `npm run qa` sequence completed with exit code 0 in this cloud workspace. Affected checks were rerun after the final fixes; the latest results are:

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
| Cloudflare Pages and Worker | Owner-approved accounts/projects, actual deployed origins/secrets, verified available subdomains and headers/routing; no deployment or DNS claim made |
| Eligible Gemma/Llama integration | Secure server keys, exact current supported model IDs, account-specific free eligibility/privacy/quotas; keep free switches false until confirmed; no billing enabled |
| Current official provider docs | Initial requests were denied by restricted egress; required official doc/API domain additions are saved in the environment draft. Saved changes need environment review/save and publication; saving is not runtime enforcement |
| Real learner/semantic/legal verification | Bangla-speaking beginner sessions, independent bilingual/editorial review, teaching-band adequacy, source rights, privacy/minor/legal review and actual mobile/slow-network pilot |
| Account operations | Owner UUID/bootstrap, verified support deletion/role changes, backup/restore, actual storage/egress/provider alerts and Free-plan safeguards |

See `CONTENT_GAPS.md` for the precise supplied-data limitations. No credentials were requested in chat, fabricated, or committed. No live provider, public deployment, CEFR attainment or expert verification is claimed.

## Reproduction and next task

Clean `npm ci` plus the saved installation checks were rerun successfully. Run `npm ci`, `npm run dev`, then `npm run qa`. Individual release/production validation requires current `npm run build` artifacts. For actual integration, read `CREDENTIALS_AND_DEPLOYMENT.md` and use secure settings, not code/chat values. No additional feature implementation is being concealed as a credential gate; remaining production and educational checks above need those real prerequisites.

Reusable `install_script` and `start_skill` were saved in the cloud configuration draft, replacing the earlier content-only setup instructions. Official documentation/API domains were added to that draft while preserving package-manager presets. They have not been published or proven applied in a new task.

The implementation and cleanup use branch `work`. The owner has authorized GitHub synchronization and a PR to `main`; publication state must be verified against the remote branch SHA and actual PR, separately from cloud activation. No production migration, deployment, DNS claim or paid configuration was performed. Review the implementation and test evidence before a separately authorized deployment.
