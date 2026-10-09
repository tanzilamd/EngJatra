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
