# CODEX MASTER EXECUTION PROMPT — ENGJATRA

**Role:** You are the full product-delivery engineering team for EngJatra: staff engineer, frontend developer, backend/data engineer, experienced English-learning UX designer, AI-integration engineer, AppSec reviewer, test engineer, technical writer and project manager.

**MISSION — BUILD THE COMPLETE APPLICATION:** The owner authorizes a brand-new implementation in the connected GitHub repository using the attached specifications and research content. Do not stop at an outline, an attractive landing page, a proof of concept or static mockup. Deliver the full student application, independent secure admin application, learning engine, persistent backend integrations, AI router/fallback adapters, test suite, deployment configuration and robust documentation. Continue across milestones with repeated testing and fixes until everything reasonably executable **without unavailable external credentials** passes. If execution/time/tool limits interrupt, preserve a precise work log and a resumable task list; pick up at the next task on continuation. Do not say “finished” when only a slice is built.

## Priority 0: Study the files before coding
0. If the repo initially contains ONLY the uploaded `EngJatra_Codex_Complete_Handoff_v1.zip`, first unzip its `EngJatra_Codex_Handoff_v1/` contents into the repository ROOT (so root `AGENTS.md` exists), then read these files. Do not merely commit/refer to an unextracted ZIP; verify no path traversal or accidental overwrite, then proceed. The owner may instead have extracted/uploaded the files already.
1. Inspect the repository contents and read root `AGENTS.md` and all docs referenced therein, especially `docs/PRODUCT_PRD.md`, `docs/BRAND_DESIGN.md`, `docs/ARCHITECTURE_AND_DATA.md`, `docs/LEARNING_CONTENT.md`, `docs/AI_TUTOR.md`, `docs/SECURITY_PRIVACY.md`, `docs/ADMIN_OPERATIONS.md`, `docs/QA_ACCEPTANCE.md`, and `docs/IMPLEMENTATION_RUNBOOK.md`.
2. Inspect `content/source/`, `content/units-public/`, `brand/`, and `content/reference/`. Validate input counts and relationships. Use the content as research data; do not treat it as teacher-certified or a complete global C1 qualification.
3. This repository must be a fresh build. **Explicitly exclude all previous discarded prototypes, demo HTML and frontend/backend/application code.** If a repository contains an old app, stop importing it: create a clean implementation without building upon old app code. Keep teaching JSON and these new design files.
4. Resolve missing implementation details responsibly. Record durable decisions in `docs/DECISIONS.md`, not scattered chat. Do not change the brand, hosting choice, learning approach, privacy requirements or free-only constraint without owner approval.

## Product promise and visual quality
EngJatra is a polished **Bangla-first AI + non-AI English learning journey** from absolute zero (Pre-A1) through a C1-oriented learning track. The interface must be **beautiful, minimal, memorable and exceptionally easy to understand**, not a dull worksheet and not a giant dashboard. The learner should always see one obvious next action. Use the finalized EngJatra blue/navy/amber/teal design system; Inter + Hind Siliguri; distinctive minimal journey/speech brandmark. Small meaningful animations, not visual noise. Consistent mobile and desktop layouts; excellent Bengali typesetting. Student main navigation: **হোম / শেখা / অগ্রগতি**. Help, settings, report and profile are secondary. Admin has its own separate protected UI, not a hidden button in the learner app.

## Feature scope — no arbitrary omissions
- Onboarding: responsive welcome, Supabase Google/email auth and recovery, privacy, first-start zero-English vs some-English choice, optional placement practice, skippable/replayable <=3-step tour, contextual tips, account preference sync.
- Home: last confirmed progress, big Continue CTA, day's achievable practice, no-AI continuity, review prompt, status for unsynced progress, elegant empty/loading/error states.
- One coherent learning path: Pre-A1, A1, A2, B1, B2, C1; unit goals, unlock rules that promote learning but never imply certified level, review and return-to-unit; versioned content that downloads only the unit needed.
- Lesson experience: micro-explanation in Bangla, contextual vocabulary with meaning and illustrative sentence, authored reading, sentence tiles, grammar detective, multiple-choice with correct feedback, branching scripted chat, evidence hunt, spaced retrieval, error revision, free writing with **rubric/self-check**, suitable checkpoints and progress persistence.
- AI tutor: written conversation only, one question at a time, Bangla scaffolding, level-sensitive feedback and hints, validated structured output, ability to report a bad AI answer. Model fallbacks after verified provider errors; no fake voice features. AI not available -> suitable authored exercise shown immediately without losing place.
- Tracking: cross-device resume, completion and mastery recorded separately, spaced-review due list, recent mistakes, saved words, bounded/paginated conversation history, understandable personal progress; privacy-safe export/delete options.
- Admin: dedicated privileged app, dashboard, content edit/correction workflow, item version management, moderation of incorrect content reports, review/status flags private to admins, publish to versioned static assets through explicit secure mechanism, emergency suspension, logs, learner/support controls with least privilege, quota monitoring and backout.
- Public content release: static JSON/CDN for large immutable instructional text; dynamic Supabase for personal data, reports, admin records and small pending overrides. Do not leak publication_status/human_reviewed/cefr_verification in any public delivery or repo-readable asset.
- Content: implement **all 96 preauthored lessons** with the provided content, correct data parsing, activities and level navigation; do not replace with placeholder lorem ipsum. Include the 932 vocab records, 132 grammar cards (including 36 level-scoped supplemental cards without `unit_id`, which must be discoverable in a grammar library), 96 scripted conversations, 480 offline activities and 12 additional readings. Where content is incomplete, ambiguous or linguistically questionable, retain under proper editorial workflow, visibly provide safe alternatives and report the exact gaps. Improve obvious mistakes with reviewed original content and create regression tests for fixes; do not claim teacher review. Author additional useful practice where justified without undermining quality. Avoid copyright infringement.
- Free-only services: Cloudflare Pages/static assets + Pages Functions or Workers, Supabase Free, verified free Gemma + independently verified free Llama fallback. The `engjatra.pages.dev` URL is a candidate, not reserved. Guard against exceeded quotas, throttling and surprise paid upgrades. Be honest: free service cannot guarantee unlimited users.

## Architectural mandate
Use typed React/Vite/TypeScript, Tailwind and a lean package manager, Node LTS, accessible reusable components, portable service interface boundaries. Suggested organized monorepo structure:

```
apps/student-web/        # learning UI
apps/admin-web/          # separately protected administrative UI
packages/ui/             # reusable tokens, buttons, form components
packages/contracts/      # shared Zod/TypeScript API and content schemas
packages/learning/       # deterministic scoring, progression, spaced-review
packages/data/           # typed content fetcher, adapters
functions/ or workers/    # authenticated AI proxy and other protected APIs
supabase/migrations/     # forward-only SQL with RLS, indexes, policies
supabase/tests/          # RLS positive/negative, migrations
content/source/          # public-safe authoring data, versioned
content/units-public/    # public-safe segmented JSON; never admin status
brand/                   # approved icons/logos/design assets
scripts/                 # content checks, public export, smoke tests
.github/workflows/       # lint, types, content validation, unit/E2E, build
.env.example             # ONLY key names/placeholders; safe defaults
.dev.vars.example        # NO live credentials
```

This is a conceptual suggestion; choose deployable Cloudflare project roots/build commands and document them exactly. Monorepo may deploy student and admin as separate Pages projects from the same repository. Keep one clear root command to develop/test/build, lock dependencies, no duplicate conflicting docs. Prefer real features and tests to abstraction for its own sake.

### Backend and security must actually work
- Supabase Auth with Google + email as configured; note that OAuth/email confirmation require dashboard setup. Use public anon/publishable key only in browser. Strict RLS on all per-user and admin tables; verify auth role server-side; **negative authorization tests** mandatory.
- Suggested tables: profiles, learner_settings, learner_paths, activity_attempts, unit_completion, vocabulary_mastery, mistake_events, conversations, messages, user_reports, admin_memberships, admin_audit, content_overrides, content_releases, provider_health, usage_counters. Refine schema/indexes/retention; avoid unnecessary writes and runaway storage.
- Sync meaningful checkpoints with stable ID, content version and idempotency key; show pending vs confirmed saved state; handle offline and concurrent device conflicts without losing last known valid data.
- No public user profiles, social feed, chat between students, file/PDF uploads or voice in v1.
- Guard AI by validated session, ownership, input size/context/token caps, abuse/rate limits, safe content prompts, timeouts, controlled retries and circuit breakers. Do not use local browser LLM downloads. All secrets server-side; never send service-role key to browser or upload it to Git.
- An offline script/game must remain available if providers fail or all requests are used. Never claim specific reset minute/day if unsupported.
- Content correction must be usable: immediate admin suspension overlay, editorial patches in protected database, test/publish revision to CDN via secure release channel, explicit success after actual publish and rollback. Avoid a button that falsely says “published” when changes exist only in database.
- Separate student JSON export from private review metadata at build time; include an automated **negative scan** for forbidden fields. Do not include private review queue or AI keys in a PUBLIC repository, even if not copied to the website.

### AI provider model integration
Implement both providers behind a small consistent adapter interface. Use real provider SDK or HTTP spec only after verifying latest official docs and that exact model IDs support the required format and free eligibility. Never assume the Gemma and Llama limits provided in old discussions are current. Distinguish server misconfiguration, invalid API key, timeout, 429 unknown, proven RPM, proven TPM, proven daily provider quota, user fair-use quota, and exhausted fallback. Parse Retry-After only when available. Retry boundedly for transient failures; no unbounded retries. Provide deterministic fake provider for tests. Log only minimal safe metadata. Privacy disclaimer for cloud AI.

### Educational integrity
- CEFR bands are pedagogical track positioning only; a student's C1-track completion does **not** confer C1 language mastery or certificate. V1 listening/speaking are external practice/resource guidance, NOT assessed skills.
- A vocabulary spelling can have multiple meanings; do not equate whole word with one verified CEFR level. Keep source IDs and per-sense teaching level distinct; annotate uncertain senses internally only.
- Fixed-key scoring must accept all authored valid variants; free writing is not a pass/fail exact-string test. AI scoring is fallible. Don't display fabricated pronunciation results.
- Editorial statuses (Research-Based, Reviewed, Flagged etc.) exist **only for authorized staff**; absolutely no student badge/icon/tool-tip/endpoint to reveal them. Students can file Reports but not see those flags.
- Content research data does not include an independent teacher signoff. Do not invent “expert approved,” “fully accurate,” “CEFR certified,” or “no mistakes” labels.

## Credentials will come later — still build now
The owner has not yet supplied Supabase, Cloudflare, Google AI or alternate provider keys. **Do not ask for, guess or fabricate them in this run.**
1. Finish all local coding, styling, reusable components, migrations, API adapter implementations, mock integration, docs, content QA and automated/browser tests possible without credentials.
2. Add `.env.example`, `.dev.vars.example`, secret mappings and production validation; do not put fake values that look operational and never commit secrets.
3. Provide a functional **clearly labeled LOCAL DEMO** adapter for development/testing only, with isolated seed users/content. Never use this as production authentication or admin bypass. Production build must fail closed/show setup-required states for unconfigured services.
4. Create a precise `docs/CREDENTIALS_AND_DEPLOYMENT.md` with a check list of **what, where, why**. Include Supabase project URL + anon/publishable key, Google OAuth client setup/redirects when enabled, server-side Supabase secret if truly required, Cloudflare project / Pages environment and Worker secrets, tested Gemma key/model and tested Llama provider key/model. Limit privileges; avoid unnecessarily requiring a GitHub write token. Require owner approval for actual production migrations, deployment, DNS/domain claims and enabling paid settings.
5. Implement integration smoke tests that can run later when operator-configured keys arrive. Mark these as **NOT RUN — AWAITING CREDENTIALS** until actually exercised; never claim they passed.

## Repeatable QA — verify, fix, repeat
Every completed subsystem has automated acceptance criteria. Run and fix until green:
- `lint`, strict `typecheck`, unit tests, content schema/ID/forbidden-public-field audit, DB migration/RLS tests (local Supabase if available), integration tests, browser Playwright E2E at mobile and desktop widths, accessibility checks and production builds.
- Test sign-up, auth failures, wrong roles/privilege escalation, saved progression after refresh/device sync, network interruption, storage conflict, all six levels, every authored content unit loading, activities/keys, plausible alternative answers, report to admin to correction release, and offline AI fallback.
- Simulate healthy Gemma -> rate-limited -> Llama -> exhausted, unknown 429, timeout, invalid response, no token leakage and fair-use limit; verify correct Bengali messages and no provider model leaks.
- Scan built frontend/static content, routes and API for admin-only status fields and secrets. Unit JSON must stay small and lazy-loaded; QA PageSpeed/performance as feasible without production traffic.
- Peer-review your own code for maintainability, accessibility, clarity and drift against docs. Do not stop after one test run; rerun after fixes. No sweeping hidden requirements dropped.
- Red/blocked tests need a written reason and next action. No blanket "100% complete" claim. External production tests and real learner/teacher review cannot be faked.

## Developer experience, continuity & GitHub rules
- Document all commands/Node version, repo tree, architecture overview, APIs, schema migration process, RLS policy rationale, content authoring and release workflow, AI quota support, common faults, tests and deployment. New developer can clone and run with a simple sequence and see a useful demo without credentials.
- Maintain `docs/STATUS.md` as a living checklist with each feature: done / verified / blocked + owner dependency. Maintain `docs/DECISIONS.md` for significant design choices, `docs/CHANGELOG.md` for behavior changes, and `docs/HANDOFF.md` for what the next Codex/AI/human should read first.
- Add meaningful `README`, `.gitignore`, `.editorconfig`, `.env.example`, lint/formatter, test configs and GitHub Actions checks. Prefer readable file names and domain-based modules, no random duplicate pages/boilerplate.
- Implement in small reviewable commits or PRs when possible and permitted; avoid push to default branch without owner instruction or repo policies. Do not delete user data or old unrelated repositories.
- If the token/time budget is reached, persist progress in repository docs with executable next instructions. On continuation, read STATUS and resume; do not declare full completion to escape the task.

## Finish report format (REQUIRED)
1. What shipped (precise student/admin/backend features)
2. Relevant commands + evidence of actual tests run and their results
3. Local demo / preview steps
4. Supabase migrations & RLS status; Cloudflare config status
5. Content coverage / known educational limitations
6. What is blocked ONLY by owner credentials/services or real-world testing
7. Exactly what the owner must do next to activate production (no pasted credentials)
8. Git commit/PR links and current branch if available

**START:** Inspect docs/content/assets, create a clear execution checklist, then implement the ENTIRE EngJatra product systematically. Make changes rather than merely restating the plan. Iterate QA and fix everything possible. Be candid about external/real-world limitations.
