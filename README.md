# EngJatra

Bangla-first English practice from Pre-A1 to a C1-oriented track. Fresh React/TypeScript implementation of the original handoff specifications; no discarded application code was imported. Student and admin are independent applications. Reading, vocabulary, authored activities and scripted dialogue work without AI.

## Start locally

Use Node **24.19.0** (`.nvmrc`) and Python 3.12+.

```sh
npm ci
npm run dev
```

This starts the student Vite server on port **5173**, the separate admin server on **5174**, and a local Cloudflare Worker on **8787**. Choose the clearly marked local demo on each application. The mock service stores isolated learner/staff records in memory; refreshing the browser retains the running service's state, but restarting the Worker resets its mock database. Personal checkpoints also retain an account-scoped pending queue in browser storage. No demo authentication is accepted in production.

For credential-backed development, configure the public browser fields in `.env` and server bindings in `workers/api/.dev.vars`, then use `npm run dev:live`. These files are ignored; copy the examples and enter values securely. Do not paste credentials into issues or chat.

## Validation

```sh
npm run qa
```

Runs export, documentation consistency, lint, strict types, content audit, unit/API/sync/local PostgreSQL RLS tests, desktop/mobile browser journeys and accessibility checks, production builds, Worker dry-run compilation, actual Static Assets browser checks, release validation, and artifact scans. Local browser tests use `/usr/bin/chromium`; set `CHROMIUM_PATH` to your browser, or set it to an empty string after `npx playwright install chromium` to use Playwright's managed browser. CI installs its browser explicitly. Python is used by the original handoff audit; application runtime uses Node/Cloudflare.

Individual commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:content`, `npm run test:docs`, `npm run test:db`, `npm run test:e2e`, `npm run build`, `npm run format:check`. `npm run test:production` verifies fail-closed production pages and public offline caching. No normal build deploys or applies migrations.

## Repository

| Path | Purpose |
| --- | --- |
| `apps/student-web` | Bangla learner app; exactly Home / Learn / Progress as primary destinations |
| `apps/admin-web` | Separate role-protected editorial and operational interface |
| `packages/contracts` | Validated public content, personal state and API contracts |
| `packages/learning` | Scoring, progression, retrieval schedule, conflict merge |
| `packages/data` | Supabase Auth, API and durable pending checkpoint client |
| `packages/ui` | Brand tokens, accessible shared components, self-hosted fonts |
| `workers/api` | Verified auth, role checks, bounded AI routing, reports, private operations |
| `supabase` | Forward migration and executable PostgreSQL policy tests |
| `content` | Original teaching data, untouched by generated build export |
| `scripts` | Allowlisted public export, audits, release artifacts, deployment smoke checks |
| `tests` | Unit, API, sync and browser evidence |

Public assets are generated into ignored `apps/*/public` and `apps/*/dist`; never copy all source material into a web bundle. There is one npm lockfile. Read `AGENTS.md` and its referenced specifications before changing product behavior.

## Current status and production

See [STATUS](docs/STATUS.md) for exact evidence and remaining external gates, [HANDOFF](docs/HANDOFF.md) for architecture, and [CREDENTIALS_AND_DEPLOYMENT](docs/CREDENTIALS_AND_DEPLOYMENT.md) for operator activation. Real Supabase auth/RLS, deployed Cloudflare routing, exact account-specific free Gemma/Llama eligibility, independent bilingual editorial review and real learner testing remain external verification gates. The app does not claim certification or unlimited free access. No live hosting URL has been verified.

## Main and automatic production deployment

Routine work uses `main`: fetch/sync, preserve unrelated changes, implement, run QA, commit and push directly without a feature branch or PR. Never force-push or bypass protection. The single production workflow is `.github/workflows/ci.yml`: main push → QA → deployment → live verification. After one-time secure account setup it deploys three independent Workers: student **engjatra**, admin **engjatra-admin**, API **engjatra-api**. The root Wrangler config is the student Static Assets target; admin and API have explicit separate configs. Disable their competing native Workers Builds triggers; Pages UI is not needed.

[Environment inventory](docs/ENVIRONMENT_VARIABLES.md) maps every value to its correct dashboard. [Simple Bangla setup](docs/DEPLOYMENT_SIMPLE_BN.md) is the consolidated owner checklist. `npm run deploy:check` validates readiness without publishing; `npm run deploy:check -- --offline` validates built local configs/assets/compilation without credentials. `npm run deploy:all` requires configuration, current QA, retained content baseline and main, then deploys and verifies. `npm run deploy:verify` is a read-only artifact/security check. Production secrets are uploaded additively and never sent to static sites. No build command applies Supabase migrations.

The workflow and scripts are implemented; actual account linkage, secrets, free eligibility and live deployment remain unverified until accessible. Missing inputs fail visibly rather than pretend production success.
