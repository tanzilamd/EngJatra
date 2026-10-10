# Security, Safety, Privacy, Free-only guardrails

## Threat model
Public free web app attracts credential stuffing, automated API quota exhaustion, forged admin mutations, leaked AI tokens, malicious content reports, data scraping of private history, cross-user progress reads, malicious HTML/prompt injection, and client sync races. Implement defense-in-depth, not decorative security badges.

## Data security
- Supabase RLS and grants across all exposed user tables, explicit `auth.uid() IS NOT NULL` checks; users only own rows; test negative read/write. No RLS bypass via `service_role` in client or unauthenticated Worker calls.
- Role membership private/protected; bootstrap only an explicitly owner-nominated, verified existing Auth UUID through protected operator SQL with an audit record. Prefer JWT verified server side AND database-backed role checks; avoid trusting `role` sent by client. No user ability to edit their own admin membership.
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

## Current launch privacy boundary
Google API terms (https://ai.google.dev/gemini-api/terms, read 2026-10-10) restrict API clients likely accessed by under-18s and unpaid use in EEA/Switzerland/UK. Free prompt/output processing includes product improvement and possible human review. The UI now discloses this explicitly; keys and learner messages remain server-side and out of monitoring/artifacts. AI stays disabled pending eligible audience/account review; no superficial age checkbox substitutes for provider or legal approval. A general-audience public learning site must receive appropriate child/teen/privacy/source-rights review before unrestricted launch. No legal compliance is certified.

Auth mail confirmation is independently provider-enforced; Worker verifies the provider-returned confirmed email as well as Auth UUID before role queries. Google confirmation comes from Supabase after actual OAuth. Signup/recovery test tokens are minted only for new marked disposable fixtures, held in memory, consumed once and cleaned up; these are not registration mail or Google evidence. Branded templates preserve `{{ .ConfirmationURL }}` and no scripts/external trackers.
