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
