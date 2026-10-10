# EngJatra Architecture Decision Log

## 2026-10-09 — Historical product/brand and technology planning decisions

The hosting and Git workflow proposed here are superseded by the environment/deployment decision below; current operations use three Workers and synchronized main.

- Product = EngJatra; exact casing and finalized branding (primary blue #2563EB, navy, amber and teal; Inter and Hind Siliguri).
- Brand promise = "Learn English. Enjoy the Journey."; all instructional UI Bengali-first.
- Hosting = Cloudflare Pages Free; secure server-side Functions/Worker where needed, no paid automatic upgrade.
- Dynamic auth/progress/history/admin = Supabase Free, with RLS. Static immutable curated course content = versioned Cloudflare CDN JSON.
- Primary/fallback AI architecture = verified free Gemma then independently verified free Llama provider. Exact model IDs and quota must be validated at connection; no credentials yet.
- Admin UI separate and privileged, content review/verification flags ADMIN-ONLY; publicly shipped JSON must omit them.
- Previous application prototypes/HTML/service-worker implementation are cancelled; **none included or to be imported**. Pre-authored educational JSON remains permitted as source data.
- 96 teaching-band unit research library is starting material only; not externally teacher-verified nor proof of mastery at C1.
- No forced deployment before credentials and actual integration tests. Codex should code/test thoroughly in local mock mode first.

## Record new decisions below (for implementers)

Use date, rationale, impacted modules, trade-offs, acceptance tests, rollback if necessary. Avoid duplicate conflicting documents.

## 2026-10-09 — Implementation decisions

- Fresh Node 24.19.0 React/Vite/TypeScript/Tailwind application; one npm lockfile and separate student/admin deploy artifacts.
- Normalize teaching data through Zod allowlists rather than expose raw authoring files. Keep all 36 supplemental grammar cards discoverable. Preserve missing example translations as missing instead of fabricating them.
- Use user-authorized Supabase REST/RPC and `GET /auth/v1/user` verification, with PostgreSQL RLS and explicit staff membership. No service-role key or frontend admin bypass is required.
- Use PostgreSQL path locks, revisions, idempotency receipts and normalized rows. Retain confirmed versus pending state separately; account-scoped queues survive refresh. Summarize attempts without raw answers, with disclosed retention limits.
- Use PGlite to execute actual PostgreSQL RLS/functions locally with an auth shim. Real Supabase auth/PostgREST/cloud tests remain distinct.
- Demo authentication requires explicit development build mode and guarded loopback Worker bindings; production artifacts remove browser demo callbacks and fail closed with missing configuration.
- Provider adapters default disabled and have no assumed live model IDs. Google/Groq documented contract compatibility and actual free eligibility must be checked against current official docs/accounts. Initial official doc fetches were blocked by restricted egress. Unknown 429 stays unknown; no fabricated reset timer. No paid fallback.
- Use audited manual public-safe release export/deploy instead of requesting GitHub write tokens. Verify hashes in four batches, keeping free Worker subrequest budgets bounded; only an owner can record actual deployment after verification.
- Preserve old immutable release directories. A new lesson uses the current manifest; an in-progress lesson pins its prior version. Static caching never caches private API/auth data or bypasses an unavailable suspension check.
- Sensitive role grants and account deletion remain explicit verified-owner operations, documented in the operator runbook; the student can submit a deletion request but never receives a false deletion acknowledgment.

## 2026-10-09 — Permanent maintainer documentation

Compared both completed build prompts against every permanent specification before removal. The combined prompt contained an exact copy of the standalone prompt and twelve exact reference attachments; its attachments introduced no unique requirements. Removed the two completed prompts after preserving durable delivery, continuation and reporting guidance in `AGENTS.md`.

The requirements remain organized by responsibility: product/UX in `PRODUCT_PRD.md` and `BRAND_DESIGN.md`; architecture and sync in `ARCHITECTURE_AND_DATA.md` with implemented details in `HANDOFF.md`; corpus coverage, sense semantics, answer variants and limitations in `LEARNING_CONTENT.md` and `CONTENT_GAPS.md`; free provider behavior in `AI_TUTOR.md`; security/privacy in `SECURITY_PRIVACY.md`; protected release/support workflows in `ADMIN_OPERATIONS.md` and `CREDENTIALS_AND_DEPLOYMENT.md`; acceptance evidence in `QA_ACCEPTANCE.md` and `STATUS.md`. No brand, privacy, hosting, learning or free-only requirement was relaxed.

Future sessions maintain the accepted application rather than restart the initial build. Historical milestone/baseline documents are explicitly labelled, the Bangla startup guide uses permanent docs, and the older credential checklist now matches the actual `VITE_SUPABASE_ANON_KEY` binding. A standard-library documentation checker joins root QA and CI. Repository publication is authorized separately from production deployment.

## 2026-10-09 — Main-only Worker deployment automation

The owner explicitly supersedes the earlier feature-branch/PR and Pages-first operations: routine work commits/pushes synchronized main directly; no protection bypass or force-push. Preserve separate student/admin/API boundaries and Free constraints. Reuse the intended `engjatra` name for student Static Assets, `engjatra-admin` for admin and `engjatra-api` for API. Root default config is student, never API; explicit per-target config disables framework guessing.

Choose one GitHub Actions main production trigger because the existing Workers Builds interface and generic monorepo deploy caused target/assets/date errors and cannot itself establish the full QA dependency. Disable competing native builds once. Repository configs include assets directory/SPA/date, API preserve-vars and no blank runtime defaults. Browser API origin automatically augments CSP; generated Pages catch-all rewrite is removed. Actual Wrangler asset servers are browser-tested.

Do not require service-role, Google/SMTP runtime keys, Pages projects, personal GitHub tokens or paid services. Canonical public inputs feed browser build and API binding; provider keys are additive API-version secrets in protected temporary files. QA source/commit proof, Supabase/account preflight, strict uploads and remote tag/hash/security verification separate local success from actual publication. Deployments are sequential; partial failure is explicit. Retain prior verified artifacts and immutable versions; reject overwrite/downgrade or missing baseline rather than delete cached learner content. One-time dashboard/credential/legal gates are consolidated in the Bengali guide and exhaustive inventory.

## 2026-10-09 — Shared redesign, themes and public-only PWA

Keep the existing application, six tracks/96 immutable units, progress contracts, Supabase RLS and single production pipeline. Shared semantic CSS tokens and native dialogs replace inconsistent surface styling; a synchronous external theme script applies System/Light/Dark before React, without weakening CSP. One shared session subscription gates lazy workspaces and recovery before loading account UI. Authentication has distinct sign-in/sign-up/reset states, field errors and truthful confirmation outcomes. Bengali UI wording can improve without changing educational keys or meaning.

The student build emits one versioned service worker and manifest/icons. Installation follows engagement and browser permission, remembers dismissal and supplies accurate iOS instructions. Updates require a user click, keep a previous public shell and preserve session/progress storage. Cache only clean same-origin public files; never API/Auth/query/private responses. A minimal, source-scoped suspension snapshot permits cached lesson reads for at most 24 hours offline while online errors fail closed. Storage failure must not turn a successful network read into an error. Authored activities remain usable with AI disabled.

Lazy entry/workspace/lesson/library modules and paginated vocabulary reduce initial payload without adding dependencies. Enforce 140 KiB initial JS and 10 KiB CSS gzip budgets; measure actual live cold-browser performance after release. Changes are reversible through the existing verified release mechanism; no migration or teaching-content release is required for this UI-only rollout. Acceptance includes light/dark screenshot and axe matrices, native dialog keyboard checks, mocked Auth failure/recovery regressions, actual production/Static Assets browser checks and separate live learner/reviewer verification.

## 2026-10-10 — Final confirmation, startup and provider eligibility

Keep provider-enforced email confirmation with frontend/API defense in depth. Google identities use Supabase's verified confirmation without another email. Pace resends, preserve generic anti-enumeration feedback and provide explicit recovery-expiry escape to login. Brand mail through version-controlled templates and narrowly reviewed Auth configuration, never application SMTP keys. Real token lifecycle and inbox/Google consent are separate evidence.

Load the single Supabase SDK after a public first render while disabling Auth until ready; retain the stored-session/callback loader and SDK shell precache. Register the single SW after load/idle so install traffic does not compete with first paint. First-render bundle savings are separate from total downloaded SDK bytes and measured LCP.

Reuse the existing masked Actions Gemma key for metadata verification in the sole main pipeline, without inference/learner data. Official Gemma 4 pricing is free but Google API terms restrict age/audience/regions and unpaid prompt processing. Keep activation disabled until actual eligible account/audience is established; do not create a paid substitute or treat a model metadata response as inference success. Fix malformed provider response taxonomy and avoid quota consumption when all providers are disabled. No teaching release, data migration or existing account mutation accompanies this rollout.

## 2026-10-10 — Mixed-age Google hold and additive teaching release

The owner confirmed mixed ages and explicitly retained Google AI Studio; public Gemma generation stays disabled under current terms, independently of successful metadata authentication. Do not migrate or enable paid services.

Add small, original teaching supplements through append-only versioned source release files. The exporter preserves baseline bytes and unit hashes, checks exact source sentences/senses and disallows duplicate/private/stale additions. Existing archived-artifact guards enforce already published immutability. Current library browsing follows the manifest without moving a learner’s pinned lesson. This finishes concrete translation/example gaps without bulk filler, new tables or a competing publisher; expert semantics/source-rights certification remains separate.
