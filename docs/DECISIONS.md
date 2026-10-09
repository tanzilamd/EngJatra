# EngJatra Architecture Decision Log

## 2026-10-09 — Product/brand and technology planning decisions
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
