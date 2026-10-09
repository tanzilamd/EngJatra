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
