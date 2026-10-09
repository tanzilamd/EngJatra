# AGENTS.md — EngJatra (authoritative repository instructions)

## Mission and source of truth
EngJatra is a **Bangla-first English learning platform**, from Pre-A1 to a **C1-oriented course track**, built for learners who may know zero English. It combines an excellent **non-AI learning engine** with a carefully constrained **text-only AI tutor**. The current application is the accepted fresh implementation. Maintain it; do not restart the project or import previously discarded prototypes, demo HTML, or application code. The original research content remains teaching data, not reusable application code.

Read `README.md`, `docs/STATUS.md`, `docs/HANDOFF.md`, and `docs/DECISIONS.md` before work. Then read the relevant specifications: `docs/PRODUCT_PRD.md`, `docs/BRAND_DESIGN.md`, `docs/ARCHITECTURE_AND_DATA.md`, `docs/LEARNING_CONTENT.md`, `docs/AI_TUTOR.md`, `docs/SECURITY_PRIVACY.md`, `docs/ADMIN_OPERATIONS.md`, `docs/QA_ACCEPTANCE.md`, and `docs/IMPLEMENTATION_RUNBOOK.md`. This file sets enduring constraints; current implementation decisions and operational instructions refine the original proposed architecture. The original handoff QA baseline is historical evidence, not the current app status. Reconcile conflicts explicitly rather than silently dropping a requirement. Record durable decisions and migration notes in `docs/DECISIONS.md`.

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
- Work autonomously through the authorized task, issue progress, and complete feasible milestones with iterative QA. Do not claim external deployment/auth/provider tests passed without actual evidence. Keep mock/local adapters and automated tests; document real blocked checks precisely.
- Preserve all 96 units across six bands, 932 vocabulary senses, 132 grammar cards (including 36 band-scoped supplemental cards), 96 scripted conversations, 480 authored activities, and 12 extended readings. Keep incomplete content discoverable with honest alternatives and document gaps; do not invent unit mappings, teacher signoff, or placeholders. See `docs/LEARNING_CONTENT.md` and `docs/CONTENT_GAPS.md`.
- Preserve authored valid answer variants. Free writing uses rubrics/self-review, never binary exact-string grading. Vocabulary senses are distinct from whole spellings and suggested teaching bands are not verified CEFR levels.

## Engineering guardrails
- React + Vite + TypeScript + Tailwind; Cloudflare Pages hosting, Pages Functions/Worker for secret-backed services, Supabase Auth/Postgres for dynamic data; Node LTS and lockfile pinned once chosen. Favor simplicity over unneeded dependencies.
- Preserve the agreed brand, hosting, learning model, privacy and free-only constraints unless the owner authorizes a change. Keep static content on the CDN rather than route every asset through a Worker. No browser LLM downloads, public student social features, or automatic paid expansion.
- No secrets in Git, public JSON, client `VITE_*` env except **public** Supabase URL and publishable/anon key; never store Supabase service-role, AI keys, provider token, private JWT signing key, or arbitrary bearer tokens in frontend. `.env`, `.dev.vars`, credentials ignored.
- Server-authoritative auth and RLS; prevent privilege escalation, cross-user reads/writes, abusive AI requests, injection, unbounded loops and concurrency issues. Validate external JSON. Never interpolate learning text as trusted HTML.
- Commit migrations in append-only order, test fresh + upgrade path where possible, document rollback/data backup. No production-destructive changes without clear owner authorization.
- Persist stable unit/activity IDs and content versions. Store completion separately from mastery. Store only necessary answer attempts; manage storage limits without silently deleting progress.
- Local development and tests must work with missing external credentials via **explicit local demo/mock mode**, NEVER accidentally on production. Production features require real auth, strict deployment checks, explicit operator setup.
- Meet accessibility fundamentals (keyboard, labels, focus, contrast, at least 44px touch targets; test Bengali text wrapping), performance, privacy minimization and clear loading/empty/error/saved state.
- Prior to PR/finish run lint, typecheck, content audits, unit/integration tests, RLS/security tests when DB available, browser E2E, accessible flows and production build. Fix defects and rerun. Disclose tests not run and why; NEVER report 100% bug-free.

## Current repository and executable checks
- Use Node 24.19.0 (`.nvmrc`), Python 3.12+, npm and the single lockfile. Start with `npm ci`, then `npm run dev` for explicit local demo accounts. Student/admin/API use ports 5173/5174/8787. Restart processes in a new environment; do not assume old servers survived. See `README.md` for real-auth development and browser setup.
- Maintain the separate apps in `apps/student-web` and `apps/admin-web`; shared contracts, learning rules, data adapters and UI live in `packages/`. Protected handlers are in `workers/api`; migrations and RLS tests are in `supabase/`. `docs/HANDOFF.md` describes the actual boundaries, retention and API.
- Run `npm run qa` and `npm run format:check` before finishing. QA includes `test:docs`, content validation, lint/types, unit/API/sync/PostgreSQL tests, desktop/mobile E2E/accessibility, production artifacts/security scans, production fail-closed tests and release export validation. Run affected checks again after fixes. `npm run test:db` targets the database suite separately.
- PGlite tests execute PostgreSQL with a test-only auth shim. Provider mocks, Worker dry runs and local browsers do not prove live Supabase, OAuth, deployed Cloudflare, free provider eligibility, educational accuracy or legal compliance. `npm run smoke:live` remains unverified until configured through secure operator settings.
- Keep secrets, generated public/dist artifacts, test traces and private editorial queues out of Git. Keep source content and branding assets. Add public fields only through contracts/allowlists and leak checks. Use small composable modules and shared rules; avoid duplicated authorization/scoring or unnecessary dependencies.

## Everyday workflow for any future Codex/AI/human developer
1. Read relevant docs and inspect the current repo before change; note scope and acceptance criteria.
2. Preserve existing production UI and unrelated behavior unless explicitly authorized to change.
3. Identify DB/RLS/security, privacy, data contract and content-version impacts before editing.
4. Implement small modular changes, update tests/docs, run targeted then full checks.
5. For DB changes create new migration, do not rewrite committed/applied migrations; test RLS negative cases.
6. For new instructional content, keep stable IDs; run language/key editorial review; strip admin-only metadata from public assets.
7. For new AI provider integrations, verify API docs, actual free eligibility, failure handling and spend off.
8. Finish with a factual summary of changes, passed/failed/not-run tests, exact external blockers, and operator actions.

## Operational handoff and Git safety
- Maintain `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`, `docs/HANDOFF.md`, `docs/TROUBLESHOOTING.md`, and `docs/CREDENTIALS_AND_DEPLOYMENT.md` with actual behavior and reproducible instructions. If interrupted, save exact next actions and test outcomes so the next session resumes instead of restarting.
- Credentials belong in secure dashboard/environment settings, never chat, source or logs. Do all credential-independent work first. Follow `docs/CREDENTIALS_AND_DEPLOYMENT.md` for exact bindings, manually verified owner bootstrap, migration backups, release/rollback and account deletion.
- Distinguish private saved drafts, exported artifacts, awaiting-deploy releases and hash-verified deployments. Never claim publication or deletion before the operation actually completes. Retain old immutable content so in-progress learners can resume; preserve progress on rollback and quota exhaustion.
- Inspect branch, remote and working tree before committing; preserve others' work. Use reviewable commits, fetch before publication, avoid force-push and default-branch pushes without explicit authorization. When authorized to publish a feature branch, push it and open a PR to `main`; verify the remote SHA and actual PR URL. Report authentication/permission blockers honestly. Repository publication does not authorize deployment, DNS claims, paid settings or destructive production migrations.
- Completion reports include the changed features/docs, actual QA results, local reproduction, schema/Cloudflare status, content limitations, exact external gates and secure owner next actions, plus branch/commit/push/PR state. Do not conceal feasible unfinished implementation behind a credential gate.

## No false completion
"Code complete" != "externally integrated" != "production verified" != "educationally certified". Distinguish these in every completion report. Never request private keys pasted into GitHub chat/code/logs; use documented secret configuration.
