# ENGJATRA — SINGLE-PASTE COMPLETE CODEX PROMPT

Use this complete specification if desired. Actual research JSON and vector files must still be present in repo or ZIP.


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



---

# Reference attachment: AGENTS.md

# AGENTS.md — EngJatra (authoritative repository instructions)

## Mission and source of truth
EngJatra is a **Bangla-first English learning platform**, from Pre-A1 to a **C1-oriented course track**, built for learners who may know zero English. It combines an excellent **non-AI learning engine** with a carefully constrained **text-only AI tutor**. ALL existing application prototypes and previous application code have been rejected. Start a **fresh implementation**. The attached research content is teaching DATA, not reusable application code.

Read in order before doing any work: `README.md`, `docs/PRODUCT_PRD.md`, `docs/BRAND_DESIGN.md`, `docs/ARCHITECTURE_AND_DATA.md`, `docs/LEARNING_CONTENT.md`, `docs/AI_TUTOR.md`, `docs/SECURITY_PRIVACY.md`, `docs/ADMIN_OPERATIONS.md`, `docs/QA_ACCEPTANCE.md`, `docs/IMPLEMENTATION_RUNBOOK.md`. If docs disagree, this file and the more specific current document prevail over old historic drafts. Record decisions and migration notes in `docs/DECISIONS.md` when implementing.

## Non-negotiable product rules
- Product name **EngJatra** exactly. Proposed free URL `engjatra.pages.dev` is NOT reserved or guaranteed.
- All student interface, labels, help, explanations and errors in natural readable **Bangla script**. English only where learning examples, practice answers or externally named items require it.
- Brand: Inter for Latin, Hind Siliguri for Bangla, primary blue `#2563EB`, navy `#1E293B`, amber `#F59E0B`, teal success `#14B8A6`; follow `docs/BRAND_DESIGN.md`. No unrelated redesigns. Responsive, accessible, reduced motion, graceful slow network.
- Three student destinations only: **হোম, শেখা, অগ্রগতি**. A beginner can understand their next action immediately. Optional <=3 step skippable tour, replayable in help.
- Pre-A1/A1 have rich scaffolding: Bangla hints, word tiles, usable examples, graduated written chat. Reading/writing in-app; listening/speaking initially only honest linked practice guidance; **no voice, microphone, PDF upload, speech grading, or claims of certified CEFR attainment**.
- Preserve useful learning without AI: authored reading, vocabulary, grammar detective, sentence builder, branching text missions, review, quizzes. NEVER ship the AI-unavailable state as a dead end.
- Research-based AI-authored content may be published after substantive editorial QA even without teacher review; **never pretend it is expert reviewed**. Specific item review/approval/verification statuses and notes are **ADMIN-ONLY**. They must be absent from any student JSON, browser bundle, DOM, API response, source map, or downloadable payload. If repo public, do not check in confidential editorial queues either.
- User data (auth, progress, errors, history, reports) persisted in Supabase with RLS and cross-device sync. Static teaching data split into versioned JSON and served over Cloudflare CDN. Private admin records in protected DB. Low-quota, free-tier-only by design.
- Admin is a **separate protected interface** with role-enforced APIs, report handling, editorial overrides, publish/rollback, cost/quota visibility and audit.
- AI provider primary: confirmed eligible free Gemma endpoint; fallback: independently configured eligible free Llama provider. Verify *actual* IDs/caps using current official docs/account. Never enable billing or upgrade automatically. Unknown 429 subtype stays unknown. Provider keys are server secrets only.
- This request asks for a complete application build and exhaustive iterative QA. Work autonomously, issue progress and complete every feasible milestone. Do not claim external deployment/auth/provider tests passed without the necessary account credentials. Build mock/local adapters plus automated tests; document real blocked checks precisely.

## Engineering guardrails
- React + Vite + TypeScript + Tailwind; Cloudflare Pages hosting, Pages Functions/Worker for secret-backed services, Supabase Auth/Postgres for dynamic data; Node LTS and lockfile pinned once chosen. Favor simplicity over unneeded dependencies.
- No secrets in Git, public JSON, client `VITE_*` env except **public** Supabase URL and publishable/anon key; never store Supabase service-role, AI keys, provider token, private JWT signing key, or arbitrary bearer tokens in frontend. `.env`, `.dev.vars`, credentials ignored.
- Server-authoritative auth and RLS; prevent privilege escalation, cross-user reads/writes, abusive AI requests, injection, unbounded loops and concurrency issues. Validate external JSON. Never interpolate learning text as trusted HTML.
- Commit migrations in append-only order, test fresh + upgrade path where possible, document rollback/data backup. No production-destructive changes without clear owner authorization.
- Persist stable unit/activity IDs and content versions. Store completion separately from mastery. Store only necessary answer attempts; manage storage limits without silently deleting progress.
- Local development and tests must work with missing external credentials via **explicit local demo/mock mode**, NEVER accidentally on production. Production features require real auth, strict deployment checks, explicit operator setup.
- Meet accessibility fundamentals (keyboard, labels, focus, contrast, at least 44px touch targets; test Bengali text wrapping), performance, privacy minimization and clear loading/empty/error/saved state.
- Prior to PR/finish run lint, typecheck, content audits, unit/integration tests, RLS/security tests when DB available, browser E2E, accessible flows and production build. Fix defects and rerun. Disclose tests not run and why; NEVER report 100% bug-free.

## Everyday workflow for any future Codex/AI/human developer
1. Read relevant docs and inspect the current repo before change; note scope and acceptance criteria.
2. Preserve existing production UI and unrelated behavior unless explicitly authorized to change.
3. Identify DB/RLS/security, privacy, data contract and content-version impacts before editing.
4. Implement small modular changes, update tests/docs, run targeted then full checks.
5. For DB changes create new migration, do not rewrite committed/applied migrations; test RLS negative cases.
6. For new instructional content, keep stable IDs; run language/key editorial review; strip admin-only metadata from public assets.
7. For new AI provider integrations, verify API docs, actual free eligibility, failure handling and spend off.
8. Finish with a factual summary of changes, passed/failed/not-run tests, exact external blockers, and operator actions.

## No false completion
"Code complete" != "externally integrated" != "production verified" != "educationally certified". Distinguish these in every completion report. Never request private keys pasted into GitHub chat/code/logs; use documented secret configuration.



---

# Reference attachment: docs/PRODUCT_PRD.md

# EngJatra Product Requirements — v1.0 (authoritative)

## Vision
A truly welcoming, fun, mobile-first **Bangla-language** path to learn English from absolute zero. The app is one coherent, interactive journey, not a complicated menu and not just an AI chat box. AI is an enhanced practice coach; **structured authored learning survives complete AI outage**. Meaningful persistence between sessions/devices is essential.

## Users and learning model
- Audience: Bengali speakers including absolute beginners, slower learners and learners with limited data budgets; avoid collecting exact age unless operationally required. Respect privacy for minors.
- Six teaching bands: **Pre-A1**, A1, A2, B1, B2, **C1-oriented**. Track band is NOT proof of assessed/certified CEFR proficiency.
- Reading/writing in-app. Listening/speaking have linked official resources, practice scripts and self-study tips only in v1; no mic or speech analysis.
- Bengali instructional guidance is always available. It decreases contextually as written ability increases but never vanishes with no opt-back.

## Student experience
**Main navigation (and only primary destinations):** হোম, শেখা, অগ্রগতি. Profile/settings/help/report via secondary accessible controls. Prominent `শেখা চালিয়ে যাও` button.

**User journey**
1. Welcome and Google/email sign-in. Offer guest **local demo only in development**, not impersonated production account.
2. One beginner/self-assessment choice, optional brief placement exercise for returning learners.
3. <=3-step skippable and replayable tour (~30-45s). Contextual hints once per feature/tour version.
4. Begin Pre-A1 Unit 01 or recommended unit. Short goal (বাংলা) -> micro-lesson -> worked example -> 2–5 exercises -> choice-based conversation/reading -> optional AI written exchange -> simple mistake feedback -> save confirmed checkpoint -> next action.
5. All six tracks browseable. No gratuitous paywalls or fake locked buttons. Unlocking/advancement explained and tied to meaningful practice, not streak points alone.
6. Return on another device and resume last server-acknowledged saved step. Unsent changes labeled; pending sync queue safe on interruptions. Show user their personal mistakes, vocabulary spaced review, progress summary and optional (bounded) past AI chats.
7. At any item, report an incorrect explanation/translation/key or problematic AI answer. Capture version automatically; student-facing report acknowledgment only (not hidden editorial status).

## Activities
- Vocabulary in context: display word sense, Bangla gloss, English example, recall practice; distinguish user-marked known from demonstrated mastery.
- Grammar Detective: identify authored error and see concise explanation.
- Sentence Builder: flexible valid sequences where pedagogically appropriate; avoid single naive string check.
- Scripted Conversation Quest: correct/appropriate multiple paths, short feedback.
- Reading Evidence Hunt: support answers with actual authored passage evidence.
- Writing Lab: writing prompts and self-review rubric, AI feedback when available, never exact-match grading for free text.
- Mistake Revenge: revisit skills with different authored examples rather than endless identical multiple choice.
- Spaced retrieval: transparent next review timing and easy 'practice again'.
- Level checkpoint: motivational **formative practice** only. Listening/speaking not graded. C1 track completion ≠ C1 certificate.

## AI tutor
- Text only; short supportive English at learner's target level, brief Bangla correction where necessary, one question at a time, adaptive hints, alternate valid answers accepted.
- Verified configured free Gemma model primary; separate free Llama provider fallback. Unknown/free-changing quota -> fail safe.
- All errors handled specifically when evidence supports it: RPM/TPM/daily quota/per-user fair use/timeout/network/expired session/misconfiguration. Never fabricate reset times or imply unlimited free API.
- On exhaustion, transition in-place to scripted/practice content and keep last checkpoint.

## Admin product
- Privileged independent interface, separate protected route/site; must have server and DB authorization.
- Review flags ONLY in protected admin DB: research draft/reviewed/under review/reported/suspended. Learner UI/static JSON/API never reveals per-item verification flags. Research-based authored content can be learner-visible after internal editorial checks even without expert review; human expert label never fabricated.
- Queue reports, trace unit/version, revise content and publish explicit versioned updates, rollback, instant suspend critically wrong activities, moderation/audit trail. Monitor AI quota/free tier/storage/egress where observable.

## Business/operational constraints
Free-user app on Cloudflare Pages + serverless Functions/Worker and Supabase Free. Static JSON/CDN for authored content, Supabase for auth/progress/history/admin. Choose transparent limits rather than unexpected paid fallbacks or data loss. Candidate `engjatra.pages.dev` (availability must be checked). App must be maintainable for future Codex/human developers. No ads, public student social network, file uploads, browser-run LLM, voice features, PDF analysis or paid tier in v1.

## Outcomes that can be verified
- Beginner completes first Bangla-guided English sentence with no complex setup.
- 96 provided units navigable; all deterministic exercises have meaningful learner feedback.
- Returning user resumes checkpoint across devices after Supabase configured and verified.
- Session/rate errors fallback to non-AI content, no broken empty screen.
- User cannot fetch another user; non-admin cannot access admin; public build has no internal review labels.
- Whole stack can run in clear local demo mode without production secrets; deploy checklist identifies the external-only steps.



---

# Reference attachment: docs/BRAND_DESIGN.md

# EngJatra Brand, UI/UX & Design System — final v1

## Identity
**Name:** EngJatra (exact capitalization). **Tagline:** `Learn English. Enjoy the Journey.` **Bengali supporting line:** `ইংরেজি শেখার আনন্দময় যাত্রা।` **Positioning:** friendly and credible educational journey, not childish or a generic AI chat bot. The logo is a flat speech/path icon with clean EngJatra wordmark; see `/brand/` files, preserve legibility at 16–32px icon size. Starter SVG assets are ready but may be refined without breaking this concept.

## Color tokens (canonical)
| token | HEX | use |
|---|---|---|
| primary | `#2563EB` | primary CTA, selected navigation, important links |
| primaryHover | `#1D4ED8` | primary hover/focus |
| textStrong | `#1E293B` | headings, wordmark, strong UI text |
| textMuted | `#64748B` | support text and captions, ensure contrast |
| amber | `#F59E0B` | tiny motivating accent, journey step, noncritical callouts |
| success | `#14B8A6` | success/completion indicators (pair with text) |
| bg | `#F8FAFC` | page background |
| surface | `#FFFFFF` | cards, input surfaces |
| border | `#E2E8F0` | subtle separators |
| soft | `#EEF2FF` | selected/beginner hint surfaces |
| danger | `#DC2626` | genuine errors |
| warning | `#D97706` | warnings |

Provide adequate contrast; token values may be deepened for accessible text (e.g. don't put white small text on raw amber or teal) without changing brand essence. Never use color alone to signal correct/incorrect.

## Typography
- **Hind Siliguri** for Bengali UI/teaching copy; **Inter** for Latin UI and English examples; use bundled font loading or Google Fonts with resilient system fallback, no unnecessary huge font files.
- Mobile minimum main body approximately 16px, Bangla line height ~1.65–1.8, English examples ~1.5. Scale: caption 13/14, body 16, small title 18/20, section title 24, hero 30–36 (responsive). Do not make Hindi-script misrendering or tiny Bengali text.
- Strong language differentiation: English learner sentences on distinct light card/typographic style; Bengali translation behind a tap on later levels, initially visible for beginners. Respect text zoom up to 200%, narrow 320px widths and browser dark mode when supported.

## Shape/spacing/elevation
- Spacing 4,8,12,16,20,24,32,40,48 px multiples as appropriate; plenty of breathing space, no needless giant gaps.
- Inputs/buttons radius 12px; cards radius 16px; pills 999px. Buttons minimum ~44px tap height. Focus-visible outline, disabled and loading states, keyboard/tab order.
- Flat subtle shadows, simple outline icons (consistent Lucide-like), 1–2 simple delight animations maximum per interaction; respect `prefers-reduced-motion`.
- React reusable components: AppShell, TopBar, BottomNav, Button, Link, Card, ProgressBar, LessonStep, SentenceTile, ChoiceOption, HintPopover, ReportDialog, Toast, OfflineFallback, EmptyState, ErrorBoundary, AdminTable, LoadingSkeleton.

## Screen-by-screen UX contract
1. **Welcome**: immediate value proposition in Bengali; single prominent get-started action, sign-in.
2. **Auth**: Google/email, clear consent/privacy, password reset/magic link as supported; no extra fields.
3. **First choice**: "একদম নতুন" / "কিছুটা ইংরেজি পারি"; optional placement with skip.
4. **First tour**: <=3 anchored, skippable steps (continue, path, help); persisted, replayable.
5. **Home**: single obvious Continue CTA above fold, today's achievable mini goal, progress summary and due review, no social feed.
6. **Learn Path**: six bands, current unit highlighted, completed replay, next preview. One continuous flow, not four top navigation tabs for four skills.
7. **Unit Detail**: Bangla learning goal, short example, one question/card at a time, tap hint, submit/check answer, explain, Next.
8. **Conversation Quest**: NPC -> 2+ authored replies (honest outcomes), optional AI chat in the same mission; stable transitions.
9. **Vocabulary**: word + sense + English contextual example + Bangla gloss + recall, personal save/review.
10. **Reading**: original English passage, in-context word help, evidence-linked questions, easy text size.
11. **Writing**: guided short sentence -> paragraph/arguments at higher levels; accept multiple valid forms; rubrics and feedback caveats.
12. **Progress**: true completion/mastery, revision due, latest checkpoints, clear distinction between practice and certification.
13. **Settings/Help**: tour replay, language/hint preference, readability, progress export/delete, error reporting, privacy.
14. **Admin**: separate data-dense but clean site, side navigation on desktop, compact mobile menu, audited actions and verification only for admin.

## UX content and errors
Bengali-first: `শেখা চালিয়ে যাও`, `বাংলায় বুঝিয়ে দাও`, `উত্তর দেখাও`, `আবার চেষ্টা করি`, `পরে দেখব`, `অগ্রগতি সংরক্ষণ হচ্ছে…`, `সংরক্ষিত হয়েছে`, `ইন্টারনেট ফিরে এলে সংরক্ষণ হবে` (only if queued). No fake congratulation for incorrect answer; acknowledge effort and explain actual correction. Student should not see `Research-Based` / `Verified` / `Under Review` badges or internal verification in tooltips or fetched JSON.

## Pages-specific polish
Mobile-first responsive, bottom nav on small screens, wide max-width learning area on desktop; low-bandwidth unit fetch, lazy loading and good perceived speed; no hero videos, no autoplay or heavy animations. Accessible light theme first; dark mode can be built if not disruptive, but not at expense of core functionality.

## Admin design style
Same brand typography/color but sober, accessible tables and filters, confirmation on destructive actions, distinct affected content ID + version, clear unsaved/draft vs deployed/published status. Never imply review status is student-facing.



---

# Reference attachment: docs/ARCHITECTURE_AND_DATA.md

# Architecture & Data Contracts — EngJatra v1

## Choices (free-first; confirm live plan terms)
- `apps/student-web`: React + Vite + TypeScript + Tailwind static SPA, Cloudflare Pages, route-safe redirects; content on Cloudflare CDN.
- `apps/admin-web`: independently deployed Cloudflare Pages project with separate shell and privileged server-side data routes. Using the same auth tenant is okay only when protected by real claims/memberships, not security by hostname.
- API: smallest sensible Cloudflare Pages Functions or Worker(s), used for AI router, privileged admin writes, usage counters, content correction/publish workflow. **Keep static asset paths out of Worker invocations** to conserve free daily request allowance.
- Supabase Auth + Postgres for mutable user records; RLS throughout. Use small indexed queries; do not store authored lessons or copied static JSON in Postgres unless mutable exception demands it.
- Auth flows and server AI proxy must work with documented authenticated JWT verification. A frontend-only role check is never sufficient.
- Type-safe API boundaries and unit/contract versioning. Store editor drafts privately; build immutable public JSON when publishing. No surprise new paid services/queue products.

## Suggested monorepo (Codex may refine but must document exact paths)
```
apps/student-web/src/{app,pages,components,features,lib,styles}/
apps/admin-web/src/{app,pages,components,features,lib}/
packages/{ui,contracts,learning,data}/
functions/ OR workers/{ai,admin}/
supabase/{migrations,tests,seed}/
content/{source,units-public,reference}/
brand/{logo-primary.svg,logo-mark.svg,logo-wordmark.svg,favicon.svg}/
scripts/    .github/workflows/    docs/
```
Cloudflare Pages supports monorepo builds and separate Pages apps with explicit build dirs/roots. Actual build command and output folder must be tested and described for both applications. Admin and student deployment can be two Cloudflare Pages projects for same repo. Never make admin data accessible through student runtime.

## Data model (implement migrations + policies, don't just draw ERD)
| Table | Typical keys/fields | Security/behavior |
|---|---|---|
| `profiles` | PK `user_id` -> auth.users; optional alias, created_at | own read/edit; keep minimal |
| `learner_settings` | user_id PK, hints, accessibility prefs, tour version | own |
| `learner_paths` | user_id PK, band, current unit/step, content release, revision, updated_at | own, optimistic concurrency |
| `unit_progress` | user_id, unit_id, release, step/completed_at | PK or unique user+unit |
| `activity_attempts` | id, user_id, unit_id, activity_id, release, outcome, timestamp | bounded retention, own |
| `vocabulary_mastery` | user_id, sense_id, state, due_at, last_seen | own, unique user+sense |
| `mistake_events` | id, user_id, skill_tag, unit_id, activity_id, due_at | own, dedupe where justified |
| `conversations` | id, user_id, unit_id, created_at, archived_at | own, pagination |
| `messages` | id, conversation_id, user_id, role, redacted content, created_at | own; avoid large debug logs |
| `user_reports` | id, reporter_id, unit_id, item_id, release, category, text, state | user can create/own view; staff can manage |
| `admin_memberships` | user_id, role, granted_by, time | staff only; bootstrap manually, never user-editable |
| `content_overrides` | id, stable content ID, source release, patch, state, suspended, edited_by | staff only, audited |
| `content_releases` | release ID, manifest checksum, created_by, deployment commit, state | staff-only update; public only minimal version ref if needed |
| `admin_audit` | id, actor, action, object, summary, time | append-only, secure |
| `usage_counters` | provider/model, scope, window, counters | private; privacy-minimal |
| `provider_health` | provider/model, state, category, observed, Retry-After | private; no secret values |

Consider atomic checkpoint RPC/transaction, conflict monotonic revision and idempotency token. For all related inserts check role/ownership and foreign key constraints. Index `(user_id,updated_at)`, `(user_id,due_at)`, conversation messages by id/time, reports by status, content patch by content ID/release. Do not assume unlimited disk or tiny row overhead.

## Static content architecture
- `content/source`: authored learning records and manifest; **no internal verification statuses** included in public repo.
- `content/units-public/{P0,A1,A2,B1,B2,C1}/{unitId}.json`: versioned CDN payload per unit. A `manifest.json` enumerates IDs, content release, source checksum, unit URL and title. If version is embedded in filenames/URLs, old versions remain available long enough for cached sessions.
- Do **not** copy everything under `content/` automatically into a public folder. Use explicit allowlist/transformation with an automated fail-closed scan for fields such as `content_status`, `publication_status`, `human_review`, `review_status`, `admin_notes`, `verified_at`, `reviewer`, secret/auth tokens. Existing authored files are already stripped for handoff but assume future edits can reintroduce forbidden fields.
- Public low-stakes quiz answers can appear in static JSON; explain they are not tamper-proof. High-stakes test scoring belongs on server when such product is requested.
- Version individual units with stable ID + release. On updated content, advance manifest after checks; progress mappings should preserve IDs or provide explicit redirect/migration if semantics changed.
- A pending editor patch in Supabase is NOT the same as a published static asset. Must have explicit staging/published state, merge safety and deploy confirmation. Provide manual reviewed export/PR creation path if a safe automatic GitHub publishing integration is unavailable; no phantom success.
- **Emergency hide**: learner content fetch checks a minimal authenticated or public-safe blocklist overlay (no private reasons/review labels), with cache TTL and invalidation plan. Suspended item not shown while respecting free-tier request caps; design pragmatic release/process.
- Avoid full index/whole corpus fetch on startup, excessive image/media payload, secrets or admin-only flags in source maps/API errors.

## Persistence and offline sync
- Local cache is NOT a substitute for per-account server persistence. Present pending/failed/conflict/saved states truthfully.
- Persist on meaningful checkpoints and review actions, not each keystroke; idempotency and retry/backoff; stale device conflict rule documented (server revision + compare-and-swap, retain unmerged attempt where possible).
- Store `last_server_confirmed_checkpoint` separately from optimistic cursor; on session renewal reconcile. Never erase valid learner progress due to quota or client cache eviction.
- Paginate chats; make retention/export/deletion clear in privacy policies before enabling aggressive cleanup.

## Expected contracts/examples (illustrative, NOT secrets)
- GET `/api/content/manifest` or static `/content/manifest.json` -> public-safe version + level/unit list.
- GET `/content/{release}/{band}/{unit}.json` -> **public-safe unit**, immutable cache where possible.
- POST `/api/learning/checkpoint` -> authenticated unit/step + idempotency + expected revision; returns committed revision or explicit conflict.
- POST `/api/ai/tutor` -> authenticated user and unit-scoped text, typed response with known error category.
- POST `/api/reports` -> authenticated report + content version; report status not editorial verification.
- Protected `/api/admin/...` -> verify admin role on every handler, reject 401/403, log mutation.

## Build with absent credentials
Implement a **local mock adapter** and deterministic seeded data for demonstrating every student feature and admin UI without real auth; admin testing role is labelled LOCAL DEV and not usable in production. In production missing auth/server secret MUST produce setup-required fail-closed state, not a local-admin bypass. Real Supabase interfaces compile and contract tests run even when live integration test cannot.

## External sources used for operational guidance
- Cloudflare React deployment: https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/
- Cloudflare monorepos: https://developers.cloudflare.com/pages/configuration/monorepos/
- Pages Functions free pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase free project pausing: https://supabase.com/docs/guides/platform/free-project-pausing



---

# Reference attachment: docs/LEARNING_CONTENT.md

# Learning Engine & Content Quality — EngJatra v1

## Available material and honest scope
From the authored source pack of 2026-10-09: 96 units, evenly distributed over P0, A1, A2, B1, B2, C1 (16 each); 932 word/sense records; 132 grammar cards; 96 scripted conversations; 480 non-AI activities (384 autograded + 96 free-writing authored tasks); 12 extra reading texts; 6 formative checkpoints. The unit index is in `content/reference/CURRICULUM_INDEX.md`.

**These are draft teaching-band placements.** Independent expert review was not performed. Old structural QA found 0 structural issues, not 0 grammar/semantic faults. Warnings include many short readings and insufficient C1 depth for certification. Teach C1-related content but never promise the course proves C1 skills; all-four-skills CEFR mastery cannot be confirmed with no speaking/listening assessment.

## Content contracts and lesson delivery
- Stable `unit_id`, `activity_id`, `sense_id`, band (P0 mapped to public `Pre-A1`), release version, `skill_tags`, learning goal, Bengali explanation, authored examples.
- Chunk data by current unit (already present in `content/units-public`), lazy-fetch with an app manifest; avoid loading 96 units plus whole vocabulary bank on first render.
- Source data should be normalized/validated. Authoring data may contain some repetitions/incomplete lexical parts of speech. Treat `learning_level_suggested` as suggested teaching placement, NOT externally verified CEFR word sense.
- Add editorial validation for meaningful translation, coherent English examples, multiple correct answers and unique distractors; structural audit alone is not enough. For C1, check argument nuance, discourse connectors, hedging, inference and appropriate register with relevant examples.
- Keep references in source docs; don't copy long copyrighted CEFR, British Council, Oxford/Cambridge text without licensing. Create original teaching material.

## One consistent learning loop
1. Show Bengali goal + short concept.
2. Example + optional word/translation hints.
3. 2–5 authored active tasks, 1 question per view, immediate explanatory feedback.
4. A scripted mini-conversation/reading mission; optional AI written expansion when service available.
5. Retrieval/review of mistakes and meaningful checkpoint save.
6. Offer one clear next action. Never make the whole session depend on AI response.

## Scoring and grading
- Objective activity: authored correct indexes/accepted alternatives + language-safe normalization (trim/spacing/case where appropriate), with explanations of why. Don't conflate case changes that matter (proper nouns/punctuation in writing) with wrong answers.
- Sentence builder: allow multiple equivalent orders when grammatical and consistent with task objective; deterministic author-maintained acceptable sequences or rule-based grammar structures, not AI whim.
- Free writing: show rubric, example, and **self-assessed** reflection offline. If AI available provide a probabilistic suggestion, not binary “incorrect” for all non-identical answers. Always offer user edit/retry.
- Completion threshold based on viewed/practiced required tasks with retry, formative questions as diagnostic; no paywall; do not assign global CEFR proficiency based only on in-app points.
- Vocabulary states: New -> Learning -> Practising -> Demonstrated Recall; spaced-review time configurable, old states migrate on content revisions, false confidence prevented by simple tap-only advancement.
- Mistake review indexes actual `skill_tag` and authored examples, not infinite repetition of same memorized question; avoid punitive red screens and streak pressure.

## Reading/writing band progression
- Pre-A1/A1: words, short signs, forms, simple messages, basic sentences with sentence tiles and Bangla scaffolding.
- A2: short narratives, plans, simple past/future, everyday functional exchanges.
- B1: connected stories, explanations, opinions, personal experiences, paragraph writing.
- B2: balanced viewpoints, longer original passages, evidence, reasoning, registers, organized writing.
- C1-oriented: nuanced implication, complex arguments, hedging, discourse, synthesis and critique, extended writing prompts and self-review; **do not claim a 16-unit track alone equals true C1 proficiency**.
- Listening/speaking v1: external official links and self-practice scripts; track completion of resource visit/self-report, label it as self-practice, never recorded performance grade.

## Content QA & publication
- QA each item against sentence correctness, naturalness, Bengali meaning, context, answer key, other acceptable answers, level placement, cultural clarity, license and references.
- Admin editorial review records remain IN DATABASE ONLY and authorized admin UI. Site visitors must NEVER see `verified`, `research`, `teacher checked`, `under review`, internal source scores etc. Do not include hidden fields in static assets or API JSON.
- Authoring may be published with internal research-based checks; do not falsely imply independent expert sign-off. Reported content stays visible until credible serious error is verified, then suspend/correct if needed.
- Maintain versioned change list and invariant that saved progress remains valid on edited wording.
- Automated script must reject duplicate IDs, broken unit/activity cross-references, duplicate multiple-choice options, bad correct_index, empty translations and illicit private status fields. For authored examples, layered bilingual editorial QA is still required.

## External official research pointers
- Council of Europe CEFR descriptors: https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors
- Companion Volume: https://book.coe.int/en/education-and-modern-languages/8150-common-european-framework-of-reference-for-languages-learning-teaching-assessment-companion-volume.html
- British Council grammar A1/A2, B1/B2, C1: https://learnenglish.britishcouncil.org/free-resources/grammar/c1
- British Council reading: https://learnenglish.britishcouncil.org/free-resources/reading
- British Council writing: https://learnenglish.britishcouncil.org/free-resources/writing
- Oxford 3000/5000 methodology: https://www.oxfordlearnersdictionaries.com/about/wordlists/oxford3000-5000

## Additional integration note
36 supplemental grammar cards in `content/source/grammar.json` have a **level**, but no `unit_id`. They are intentionally band-scoped. Present them in a level Grammar Library and/or editorially map them to relevant units. Do not silently drop them or invent canonical unit mappings without checking their actual rule/topic.



---

# Reference attachment: docs/AI_TUTOR.md

# AI Tutor & Free-provider Failure Architecture

## Non-negotiables
- Text-only written guided English conversation with Bengali support. One question at a time; speak at current teaching band. The assistant should reward effort but accurately correct material mistakes, explain in short Bangla, accept alternative valid phrasings, refuse to falsely certify CEFR proficiency.
- Primary eligible **Google AI Studio Gemma** model (historically considered Gemma 4 26B A4B) and independently hosted **Llama** provider/model. Actual IDs, API support, quotas, commercial eligibility, and free access must be checked **at integration time**; never use a made-up model ID or assume quota totals add across models.
- Free-only: no paid upgrades, no fallback to a billable provider. Strict per-user and site-wide fair-use; no unbounded retries; prompt/token size ceilings, global fail-safe. Never claim unlimited free AI.

## Request sequence
1. Receive authenticated request at Cloudflare protected server endpoint. Validate user session/role, origin policy as applicable, unit ID/release, size, text limits, idempotency and per-user budget.
2. Load *relevant current unit lesson facts* and last few needed conversation turns. Do not send all user history. Minimize personal information; tell user cloud providers process messages as required by policy.
3. Choose configured primary provider; if eligible and healthy, call with request-level timeout/size cap; parse, validate and sanitize structured result (schema in `packages/contracts`).
4. On provable retryable failure perform bounded backoff with jitter only where provider guidance permits. Circuit-break observed temporary failures. On eligible failover, use independently configured free fallback. Do not retry on invalid key or permanent violation.
5. If both unusable, respond with specific classification if known and **offline alternative activity ID**; preserve checkpoint.
6. Persist short relevant conversation messages only if user's privacy/retention policy allows; no private prompt dumps in analytics.

## Structured response proposal
```
{
  "assistant_reply_en": "...",
  "short_explanation_bn": "...",
  "feedback_type": "none | suggestion | clear_error",
  "suggested_revision_en": null,
  "next_question_en": "...",
  "learning_tags": ["..."],
  "source_unit_id": "A1-01"
}
```
Use schema validation, bounded strings, tags allowlist, no unsanitized HTML or generated executable code. Model statements about a user's ability are suggestions not authoritative grading. If provider cannot reliably return schema, adapt with validated extraction and safe fallback, never render broken JSON raw to student.

## Error taxonomy (expose user-safe Bengali)
- `USER_SESSION_EXPIRED`: `আবার লগইন করলে তোমার শেখা চালিয়ে যেতে পারবে।`
- `AI_REQUESTS_PER_MINUTE` (only proven RPM): `এই মিনিটে AI অনুশীলনের সীমা পূর্ণ হয়েছে। নিচের অনুশীলন চালিয়ে যাও।`
- `AI_TOKENS_PER_MINUTE` (only proven TPM): `এই মুহূর্তে AI লেখার সীমা পূর্ণ হয়েছে। অন্য অনুশীলন চালু আছে।`
- `AI_DAILY_QUOTA` (only proven provider daily): `আজ AI অনুশীলনের সীমা শেষ। Reading ও Grammar অনুশীলন করতে পারবে।`
- `AI_USER_FAIR_USE`: `তোমার আজকের AI অনুশীলনের বরাদ্দ শেষ। অন্য মিশনগুলো চালু আছে।`
- `AI_PROVIDER_OVERLOAD`: `AI সার্ভার ব্যস্ত। এই মিশনের অন্য অংশে এগোতে পারো।`
- `AI_TIMEOUT`: `AI উত্তর দিতে দেরি করছে। এখন অন্য অনুশীলন করতে পারো।`
- `AI_NETWORK_FAILURE`: `সংযোগে সমস্যা হচ্ছে। সংরক্ষিত অনুশীলন চালিয়ে যেতে পারো।`
- `AI_UNCLASSIFIED_429`: `AI অনুরোধে সাময়িক সীমা এসেছে। কারণ নিশ্চিত হওয়া যায়নি।`
- `AI_PROVIDER_UNCONFIGURED`: development/admin only `AI সংযোগ এখনো সেটআপ করা হয়নি।`
- `AI_INVALID_RESPONSE`: `AI উত্তরটি ঠিকভাবে পাওয়া যায়নি। অন্য অনুশীলন চালিয়ে যাও।`
- `SAVING_FAILED`: `অগ্রগতি এখনো সংরক্ষিত হয়নি। সংযোগ ফিরে এলে আবার চেষ্টা করব।`
- `STORAGE_CAPACITY`: `কিছু ইতিহাস সংরক্ষণে সমস্যা হচ্ছে। শেখার অগ্রগতি নিরাপদ রাখতে আবার চেষ্টা করো।`
For any 429, classify RPM/TPM/RPD only from trusted provider data/counters. Do not infer type from HTTP 429 alone. Reset time shown only when evidenced; no fake timers or fake “try in exactly 60 seconds” advice.

## Provider tests (mock first; real later)
- Healthy primary; primary timeout then secondary; primary genuine RPM; TPM/daily subtype when provider states; ambiguous 429; both exhausted; invalid JSON; race on concurrent requests; invalid credential; forbidden/unconfigured providers.
- Verify no key in response/log/source map. Ensure free-only toggle and token cap hold. Stress per-user throttling and independent backoff. Paid path disabled.

## Operational uncertainty
Google's official pricing page currently lists Gemma 4 Free Tier, but usable API model IDs/rate limits still depend on account/project. Provider privacy/data-use terms may differ. Do not choose an account-specific configuration until owner supplies keys, and do not silently turn on a paid plan.
Reference: https://ai.google.dev/gemini-api/docs/pricing



---

# Reference attachment: docs/ADMIN_OPERATIONS.md

# Protected Admin Panel — workflows, permissions and publishing

## Admin scope
Dedicated admin UI (prefer separate Cloudflare Pages project with different route/hostname), sharing EngJatra visual language but using calm tables, filters, clear forms. **Server and Supabase RLS are the security boundary**, not front-end hidden nav. Default-deny all privileged operations.

## Roles
- `learner`: personal learning/report only; never review metadata or other profiles.
- `content_reviewer`: can view research notes and evaluate content/reports; limited safe editorial actions, no security settings.
- `content_editor`: create/revise content drafts, prepare release; cannot grant admin roles.
- `admin`: approve/publish/rollback content, review reports, support limited user operations, view quota and audit. For sensitive user deletion/role promotion require explicit additional verification/owner action.
- `owner`: manually bootstrapped through securely documented process, can manage admin grants.
Prevent privilege escalation via editable profile/metadata/JWT claims. Allowlist roles on server and RLS. Do not infer role from email name/domain alone. Audit all privileged mutations.

## Features
1. Dashboard: content counts by unit/band, reports status, recent correction actions, provider health, quota capacity (observed only), storage/egress indicators where available.
2. Content Explorer: search/filter ID, band, lesson type; view current published content, public source and private staff-only research/correction notes. Permission-protected statuses ONLY here.
3. Editorial workbench: adjust sentence, translation, distractor, feedback, alternative accepted response, help hint. Validation preview using real learner component. Keep draft revision and immutable published baseline.
4. Report queue: users report wrong key/translation/grammar/ambiguous answer/AI feedback; attach release/unit/item/model context automatically, avoid gratuitous personal text.
5. Publish manager: deterministic content patch -> editorial checks -> versioned JSON export -> reviewed deploy/commit flow -> verify published hash + deployment -> announce success. Use only authorized GitHub/cloud service integration. If no publishing credential, allow manual exported artifact or documented PR process, state "awaiting deploy" truthfully.
6. Emergency suspend: authorized admin can immediately disable clearly invalid/harmful *item*, with minimal public blocklist, no leak of reason, cache TTL test, reinstate after correction.
7. Rollback: retain previous release manifest and patch audit; safely revert changed item while preserving student progress. Admin sees release IDs and actor/time.
8. Support: users/status/search by minimal profile only, no unnecessary display of full private AI conversations to all admin roles; data deletion/export request workflow.
9. Ops: AI provider successful/failed calls by class, fair-use counter, stale/unconfigured settings, DB capacity monitoring threshold, incident logs.

## Critical privacy rule
Ordinary users cannot see any item-level `Research-Based`, `Expert Verified`, `Under Review` or similar content review status, including tooltips, JSON, API calls, HTML hidden attributes or GitHub-public package metadata. Reporters can see their **report's own status** if product enables that; this is not content verification status. Admin review queue is in protected Supabase DB and not shipped in repo content bundle.

## Bootstrap & mutation safety
- Owner must manually add one exact admin user UUID via a protected SQL/migration/CLI operational step after Supabase configured; do not create hidden demo admin in production.
- Every admin action requires authenticated session, authorized membership role, CSRF/session controls as applicable, input validation, audit, bounded rate, sensible confirmation for destructive changes.
- Display Draft/Queued/Deployed distinctly. Never call a draft "published".
- Reviewers/editors may prepare content but cannot grant owner/admin access by direct API request. Test forged role payloads and direct REST calls.
- Versioned source data may be public, but no sensitive editorial details belong inside it; redact intentionally and test build outputs.



---

# Reference attachment: docs/SECURITY_PRIVACY.md

# Security, Safety, Privacy, Free-only guardrails

## Threat model
Public free web app attracts credential stuffing, automated API quota exhaustion, forged admin mutations, leaked AI tokens, malicious content reports, data scraping of private history, cross-user progress reads, malicious HTML/prompt injection, and client sync races. Implement defense-in-depth, not decorative security badges.

## Data security
- Supabase RLS and grants across all exposed user tables, explicit `auth.uid() IS NOT NULL` checks; users only own rows; test negative read/write. No RLS bypass via `service_role` in client or unauthenticated Worker calls.
- Role membership private/protected, bootstrap owner manually. Prefer JWT verified server side AND database-backed role checks; avoid trusting `role` sent by client. No user ability to edit their own admin membership.
- Auth redirect allowlist, safe password reset and OAuth config, verify expiry, predictable 401/403 and recovery UX. Do not assume OAuth enabled without dashboard setup.
- No arbitrary file upload in v1. Sanitize/render learning text safely, no unsafe HTML, validate report body and structured model output, size limits on all endpoints.
- Minimize personal data, private profiles (no public social layer), keep meaningful progress. Clear consent/disclosure of third-party AI message processing. Distinguish optional chat-history deletion from permanent learning progress. Provide account export/delete path or operator support process; draft privacy/terms pages subject to legal review before launch, especially where minors may enroll.

## Infrastructure & keys
- AI keys, Worker signing keys, Supabase service-role (only if truly necessary), admin delivery tokens are SERVER-ONLY Cloudflare secrets, never `VITE_*` or checked-in files. Supabase URL and publishable/anon key are intentionally public and not a substitute for RLS.
- `.env*` and `.dev.vars` gitignored, examples placeholder-only. Never print keys even on failure. Scan repo and dist for tokens, service-role strings and private review fields.
- Serverless abuse protection: authenticated request limit, per-user fair use, sliding time window, token/size cap, global provider circuit breaker, server-side backoff, no paid provider path. Reject costly uncapped requests; graceful non-AI fallback. Workers Free budget and Supabase free limits monitored; quotas can change.
- Do not use unsupported hidden anti-bot data collection or transmit full AI conversations to third-party analytics. Logs have limited retention and redacted content.

## Secure content pipeline
- Allowlist public lesson schema; block `publication_status`, `human_reviewed`, `content_status`, `review_status`, `internal_notes`, `teacher_review`, `reviewer`, `verified_at` from static JSON and any student-facing route/JS bundle. **Do not publish private editorial review queues to a public repository**, even if hidden from frontend imports.
- Fail build on prohibited metadata leak. Respect release versions and emergency suspension; publish only after QA. Restrict admin edit/publish functions to authorized staff with audit, minimize GitHub permissions.
- Fixed answers in public JSON are acceptable for low-stakes practice; they are not secure for exam certification. No score claims stronger than the actual assessment.

## Security test matrix
1. Anonymous client cannot read/save other learners' progress or private report/AI logs.
2. User A cannot read/update/delete User B data; RLS reject direct REST/curl client requests.
3. Non-admin with a forged `role:admin` or browser route does not access protected functions/data.
4. Reviewer cannot grant owner, arbitrary DB records or deploy content without permissions.
5. Client cannot infer provider keys via network/bundle/API errors; mock and deployed builds scanned.
6. Malicious report includes HTML/SQL-like/prompt-injection text; safely stored as inert text.
7. AI prompt cannot request unrelated data, reveal secrets or bypass scope; model output sanitized.
8. Rate/quota exhaustion and concurrency preserve fair use, avoid surprising charges.
9. Account privacy export/delete honors ownership; logs do not retain unnecessary private text.
10. Large content file/failure and offline sync recover without leaking another user's cached data.

## Explicit limitations
Without actual Supabase/Cloudflare accounts, integration/published security testing is incomplete. Document exact tests not run and run after secrets are configured. External provider privacy terms/legal compliance should be checked before public release.

## References
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Functions pricing: https://developers.cloudflare.com/pages/functions/pricing/



---

# Reference attachment: docs/QA_ACCEPTANCE.md

# QA Matrix & Definition of Done (DoD) — EngJatra

## Evidence rule
Never report “fully correct”, “100% error-free”, “production verified”, or “expert verified” without real evidence. Continue development and rerun tests after every fix. File failures as defects with reproduction, severity and passing regression tests. External service unavailability is BLOCKED, not PASSED. Maintain traceable `docs/STATUS.md` with outcomes.

## Required automated scripts (implement and run)
- `npm run lint`
- `npm run typecheck`
- `npm run test` (unit/integration)
- `npm run test:content` (counts, schema, refs, public metadata strip, answer consistency, duplicates)
- `npm run test:e2e` (browser, student/admin flows)
- `npm run build` (both deployable sites/server functions and assets)
- `npm run qa` to combine all reliably; may use other commands if documented and reproducible.
- RLS tests: local Supabase CLI/Docker if available; otherwise contract tests and explicitly blocked live RLS tests.

## Minimum scenario matrix
| ID | Scenario | Expected evidence |
|---|---|---|
| E01 | New absolute beginner | within a few minutes first valid English sentence using Bengali scaffolding; 3-step tour skippable |
| E02 | Returning learner | server-confirmed checkpoint resumes after refresh; cross-device verified once backend available |
| E03 | Content availability | all 96 authored unit IDs load lazily; 6 bands; malformed/missing JSON produces useful error |
| E04 | Offline lessons | reading, vocabulary, detective, scripted mission, sentence builder, mistakes available when AI disabled |
| E05 | Answer correctness | all objective keys in range, no duplicate choices, valid alternatives allowed, writer rubric not exact-string graded |
| E06 | Content leak test | zero prohibited editorial/review/status fields in public JSON, assets, APIs, DOM |
| E07 | AI healthy | correct text-only level-sensitive response, short Bangla explanation, structured validation |
| E08 | AI graceful failures | valid primary, rate-limited primary -> fallback, all providers down -> offline exercise, no lost progress |
| E09 | 429 classification | only distinguish RPM/TPM/daily if verified, unknown stays unknown, no fabricated reset time |
| E10 | No secrets | public/client assets and returned errors contain no secret keys; no auto paid path |
| E11 | User private data | two users cross-read/write denied by RLS + API; expired sessions rejected |
| E12 | Admin authorization | unauthorized staff dashboard/API denied; forged memberships rejected; audited privileged change |
| E13 | Editorial lifecycle | learner report with item+release -> admin queue -> revision -> publish confirmation -> rollback; no false publish toast |
| E14 | History/mistakes | pagination, saved words, spaced recall, error revision, account export/delete path |
| E15 | Sync failures | offline pending queue + conflict resolution, no phantom saved state |
| E16 | Responsive UI | 320px phone, typical Android viewport, tablet, desktop, keyboard and screen readers, Bengali wrapping |
| E17 | Quotas | Worker request budget, Supabase size/egress guardrails, per-user provider spend controls, local pressure simulations |
| E18 | Build/deploy | Cloudflare Pages client build + admin build, Worker dev startup, documented deployment config |
| E19 | Low bandwidth | initial payload and unit fetching sane on throttled connection; graceful font fallback |
| E20 | Real external tests | live Supabase OAuth/email/RLS, Cloudflare deployed routing, Gemma and Llama response/rate; **BLOCKED until credentials** |

## Non-automated gates
- Editorial review of every potentially ambiguous/wrong English/Bengali instruction and C1 inference; specialist teacher review recommended. Automated structural QA cannot guarantee semantic correctness.
- Test with real Bengali-speaking beginners, check confusion points; inspect mobile screenshots, not just desktop.
- Verify source rights: original example text, linked external official teaching resources not scraped into corpus. Verify legal pages/data processor disclosures if public audience includes minors.
- Verify cloud free-tier quotas on user's actual accounts, paused DB risk and manual restore/backup; set alerts and transparent behavior.

## Completion reporting
`DONE` = implemented with automated test pass. `INTEGRATION VERIFIED` = actual live connected test successful. `BLOCKED` = cannot run without keys/account/service/teacher/real user (state exact reason). `KNOWN ISSUE` = failure not yet corrected. Final report includes test logs/dates, commands, unresolved issues and operational next steps. Major security/auth/content correctness failures block public release.



---

# Reference attachment: docs/IMPLEMENTATION_RUNBOOK.md

# Codex Build Plan, Operations and Maintainer Handoff

## Working style
Implement in **one continuous development assignment**, using milestone checklists rather than asking for repeated permission or stopping at a prototype. Iteratively build, test, fix and rerun. If tool context/turn cannot finish, write `docs/STATUS.md` with exact next action and test evidence. Stop before requiring real credentials, making paid purchases, changing billing, destructive production migrations or public deploy without approval.

## Proposed milestone dependency order
1. **M0 Clean foundation**: inspect content, start empty React/TS/Vite/Tailwind monorepo, package scripts, lint/format/types/CI, docs and examples. Brand asset + logo + language typography live.
2. **M1 Content contracts**: source and public schema, validation/negative status scan, manifest/releases, tests over all 96 units, loading current unit only; no application prototype reused.
3. **M2 Student shell**: welcome/auth shells, Bengali-first Home/Learn/Progress, onboarding tour, responsive branded components, error/empty/loading, accessibility.
4. **M3 Learning engine**: activities, checkers, reading, vocabulary sense review, conversation branches, formative checkpoints, level progression, report entry, offline non-AI continuity.
5. **M4 Persistence/Supabase**: migrations/indexes/RLS, auth UI, users/progress/mistakes/history, sync, conflict handling, local safe demo adapter, tests.
6. **M5 Cloudflare AI**: authenticated Worker/Functions and free-only Gemma→Llama, text tutor, structured output, specific errors, fair use, script fallback and tests.
7. **M6 Protected admin**: role-gated separate app, review queue, content version edits, safe override release/publish, suspend, audit, operational monitor.
8. **M7 End-to-end/ops**: test battery, XSS/RLS abuse, mobile and desktop, accessibility, content quality audit, CI workflows, quota pressure, backups/export, troubleshooting and handoff.
9. **M8 Production prep**: report evidence, obtain **operator-supplied secrets later** via appropriate platform secret settings, live integration tests, preview pilot, fix, owner-approved public launch. Never simulate these tests as passed.

## Environment and repository conventions
- Pin a supported Node LTS version in `.nvmrc` and document Windows-compatible `npm` commands. Use one lockfile/one package manager.
- Root package scripts `dev`, `dev:student`, `dev:admin`, `dev:worker`, `test`, `test:content`, `test:e2e`, `typecheck`, `lint`, `build`, `qa`, and DB setup/test as available; keep scripts working.
- Provide `.env.example`, `.dev.vars.example`, `.gitignore`, `.editorconfig`, `CONTRIBUTING.md` (future generated) with commands, architecture, errors and upgrade path.
- `.github/workflows/ci.yml` should run lint, typecheck, content tests, unit tests, build and browser tests when supported; no production deploy with missing secrets.
- Use small well-named feature folders and composable components; no duplicated role guards/answer rules, no giant 2,000-line all-in-one files. README leads a new human/AI to where to start.

## Future feature change checklist
1. Read `AGENTS.md`, current `docs/STATUS.md`, relevant specification and current actual implementation.
2. Identify auth/permissions, content contract, migrations, storage/quota cost, brand and user-flow effects.
3. Preserve unrelated production UI/spacing/fonts/colors/behavior. No silent broad refactor.
4. Write small implementation and meaningful tests, including failure and unauthorized cases.
5. DB modifications: forward-only migration, data safety/rollback documented, tested fresh + upgrade as feasible.
6. Run QA, check no secrets or review status in student build, update docs/status/changelog and summarize.

## Repo docs Codex MUST generate/maintain during coding
- `docs/STATUS.md`: per-milestone checked items and actual test pass/fail/blocked.
- `docs/DECISIONS.md`: significant decisions/reasons with dates (no old conflicting advice).
- `docs/HANDOFF.md`: new-developer startup and current project state.
- `docs/CREDENTIALS_AND_DEPLOYMENT.md`: real credential locations, setup and integration tests; do not put values there.
- `docs/CHANGELOG.md`: actual behavior and migration changes.
- `docs/TROUBLESHOOTING.md`: common incidents and fixes.
- `README.md`: authoritative setup commands from clean clone.
- `AGENTS.md`: do not delete or dilute. Additional scoped `AGENTS.md` only where it adds meaningful child rules.

## Hosting and limits
- Cloudflare Pages deploy from GitHub; candidate URL `engjatra.pages.dev` is NOT reserved. Separate student/admin Pages apps may use own `*.pages.dev` hosts. Explicit monorepo project root/build commands.
- Static assets free, nonstatic Functions/Workers requests count against Free quota. Do not route every static asset through Worker.
- Supabase Free has quotas and may pause under low activity. Backup before destructive migrations. When near free limit degrade gracefully: no AI/cloud excess; preserve learning progress and maintain safe history retention/export choices.
- External use must be confirmed after owner connects accounts and secrets. The owner requested ZERO forced spend: paid plans never silently enabled.

## Credentials checklist (all later, no keys now)
- GitHub repository access (via authorized Codex connector or UI), branch/PR permissions; no developer personal tokens in files.
- Supabase project URL + **publishable/anon** key (public but still treat config carefully), SQL migrations, OAuth/email settings and allowed redirect URLs. Sensitive service-role key only if needed and stored server-side as a secret.
- Cloudflare account and Pages projects (student and admin); Worker/Pages Functions configuration, secret bindings and env variables. Domain setup only after actual availability check.
- Google AI Studio free eligible API credential + confirmed Gemma model id and project quota; do not switch to billed account without consent.
- Free Llama provider name + specific confirmed model + credential + usage limit; independently test primary/fallback.
- Authorized owner's Supabase user UUID for first admin role, provision manually with audited instructions.
- Legal/privacy policies, backup/export owner approval and public pilot release check.



---

# Reference attachment: docs/CREDENTIALS_LATER.md

# Credentials to configure LATER (no values in repository)

The owner will supply/cloud-configure these **after** Codex has completed credential-independent implementation.

| Item | Visibility | Typical location | Required for |
|---|---|---|---|
| Supabase project URL | Public config (not secret) | Cloudflare Pages env `VITE_SUPABASE_URL` | Client auth/data access |
| Supabase publishable/anon key | Public config (RLS still mandatory) | Cloudflare Pages env `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase client |
| Supabase role/privileged key (only if architecture truly needs it) | SERVER SECRET | Worker secret, never in browser | Protected server tasks |
| Supabase local DB/test URL/password | LOCAL SECRET | Developer machine/CI secret, never commit | DB migration/RLS verification |
| Google OAuth client configuration | Platform secret/settings | Supabase Auth provider configuration | Google sign-in |
| Cloudflare account, 2 Pages projects and Functions/Worker | Access, not text in repo | Cloudflare dashboard/GitHub integration | Production deploy |
| Gemma API key & proven current model ID | SERVER SECRET | Cloudflare Worker secret | Primary written tutor |
| Free Llama provider key & proven current model ID | SERVER SECRET | Cloudflare Worker secret | Independent fallback |
| Authorized first admin user UUID | Restricted setting | Secured Supabase bootstrap procedure | Privileged staff role |

No credentials belong in this document; put only **names and instructions**. `VITE_*` is exposed in browser bundles; no API service key or Supabase service-role key may use it. Rotate keys immediately if accidentally exposed. Production smoke tests remain BLOCKED until actually configured, and no provider availability or `engjatra.pages.dev` domain is guaranteed until checked.

Cloudflare Worker secrets official docs: https://developers.cloudflare.com/workers/configuration/secrets/



---

# Reference attachment: docs/HANDOFF_QA_BASELINE.md

# Handoff package QA baseline — 2026-10-09

## Checks completed locally (handoff data/artifacts only)
- All 96 unit records present, 16 in each of Pre-A1/P0, A1, A2, B1, B2, C1.
- Authored source libraries present: 932 vocab/sense entries, 132 grammar cards, 96 conversations, 480 offline exercises, 12 additional readings.
- Public unit manifest lists each of the 96 unit IDs, 96 segmented JSON files exist with matching IDs.
- Cross-unit IDs for unit-linked conversations/grammar/offline activities and vocabulary are valid.
- Some grammar cards (36) are **supplemental per-level** and intentionally have no `unit_id`; Codex must make them available in the level library and/or editorially map them to lessons.
- Private publication/research/expert verification fields were removed from shipped data; automated audit checks for forbidden metadata in all public unit JSON and authoring data. Exception: generic learner self-review instructions such as `review_steps_bn` are educational content, not internal verification flags.
- Logo SVG assets parsed successfully as XML.

## What has NOT been verified
- No independent human/teacher review of all grammar, Bangla translations or answers.
- Structural checks cannot guarantee accurate language pedagogy, CEFR alignment, unique meanings, fully adequate B2/C1 teaching or valid all-possible open-text answers.
- No real app exists in this bundle; therefore no browser, auth, DB migrations, RLS, AI APIs, admin security or Cloudflare deploy was tested.
- Actual Cloudflare Pages subdomain availability and usage limits are not checked against owner's account.

## How to rerun baseline
Python 3: `python scripts/check_handoff.py` (standard library only).

Once Codex builds the app, it MUST implement and run comprehensive tests in `docs/QA_ACCEPTANCE.md`, update `docs/STATUS.md`, and report live integration gates truthfully.

