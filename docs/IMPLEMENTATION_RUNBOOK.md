# Codex Build Plan, Operations and Maintainer Handoff

## Current maintenance entry point
The application is implemented. Read `AGENTS.md`, `README.md`, `docs/STATUS.md` and `docs/HANDOFF.md` before changes. The milestones below preserve the original delivery plan; they do not instruct future maintainers to discard the accepted code or rebuild M0–M7. Use the feature-change checklist for incremental work and the deployment guide for remaining M8 activation.

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
- Maintain `.env.example`, `.dev.vars.example`, `.gitignore`, `.editorconfig`, and `CONTRIBUTING.md` with current commands, architecture, errors and upgrade path.
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
