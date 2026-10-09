# Architecture & Data Contracts — EngJatra v1

## Choices (free-first; confirm live plan terms)
- `apps/student-web`: React + Vite + TypeScript + Tailwind static SPA, Cloudflare Workers Static Assets, config-defined SPA routing; content on Cloudflare CDN.
- `apps/admin-web`: independently deployed Static Assets Worker with separate shell and privileged server-side data routes. Using the same auth tenant is okay only when protected by real claims/memberships, not security by hostname.
- API: smallest sensible separate Cloudflare API Worker, used for AI router, privileged admin writes, usage counters, content correction/publish workflow. **Keep static asset paths out of Worker invocations** to conserve free daily request allowance.
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
The current deployment uses three explicit Worker targets and one main-triggered GitHub Actions workflow. Configs, build outputs, readiness and retention are documented in `docs/CREDENTIALS_AND_DEPLOYMENT.md`; Pages is not required. Static assets are served without invoking API code. Never make admin data accessible through student runtime.

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
- A pending editor patch in Supabase is NOT the same as a published static asset. Must have explicit staging/published state, merge safety and deploy confirmation. Provide a reviewed public export/main-commit path if a safe automatic GitHub publishing integration is unavailable; no phantom success.
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
- Cloudflare Worker static assets: https://developers.cloudflare.com/workers/static-assets/
- Worker asset configuration: https://developers.cloudflare.com/workers/wrangler/configuration/#assets
- Workers pricing/free limits: https://developers.cloudflare.com/workers/platform/pricing/
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase free project pausing: https://supabase.com/docs/guides/platform/free-project-pausing
