# QA Matrix & Definition of Done (DoD) — EngJatra

## Evidence rule
Never report “fully correct”, “100% error-free”, “production verified”, or “expert verified” without real evidence. Continue development and rerun tests after every fix. File failures as defects with reproduction, severity and passing regression tests. External service unavailability is BLOCKED, not PASSED. Maintain traceable `docs/STATUS.md` with outcomes.

## Required automated scripts (implement and run)
- `npm run lint`
- `npm run typecheck`
- `npm run test` (unit/integration)
- `npm run test:content` (counts, schema, refs, public metadata strip, answer consistency, duplicates)
- `npm run test:e2e` (browser, student/admin flows)
- `npm run build` (both deployable sites/server functions and assets)
- `npm run qa` to combine all reliably; may use other commands if documented and reproducible.
- RLS tests: local Supabase CLI/Docker if available; otherwise contract tests and explicitly blocked live RLS tests.

## Minimum scenario matrix
| ID | Scenario | Expected evidence |
|---|---|---|
| E01 | New absolute beginner | within a few minutes first valid English sentence using Bengali scaffolding; 3-step tour skippable |
| E02 | Returning learner | server-confirmed checkpoint resumes after refresh; cross-device verified once backend available |
| E03 | Content availability | all 96 authored unit IDs load lazily; 6 bands; malformed/missing JSON produces useful error |
| E04 | Offline lessons | reading, vocabulary, detective, scripted mission, sentence builder, mistakes available when AI disabled |
| E05 | Answer correctness | all objective keys in range, no duplicate choices, valid alternatives allowed, writer rubric not exact-string graded |
| E06 | Content leak test | zero prohibited editorial/review/status fields in public JSON, assets, APIs, DOM |
| E07 | AI healthy | correct text-only level-sensitive response, short Bangla explanation, structured validation |
| E08 | AI graceful failures | valid primary, rate-limited primary -> fallback, all providers down -> offline exercise, no lost progress |
| E09 | 429 classification | only distinguish RPM/TPM/daily if verified, unknown stays unknown, no fabricated reset time |
| E10 | No secrets | public/client assets and returned errors contain no secret keys; no auto paid path |
| E11 | User private data | two users cross-read/write denied by RLS + API; expired sessions rejected |
| E12 | Admin authorization | unauthorized staff dashboard/API denied; forged memberships rejected; audited privileged change |
| E13 | Editorial lifecycle | learner report with item+release -> admin queue -> revision -> publish confirmation -> rollback; no false publish toast |
| E14 | History/mistakes | pagination, saved words, spaced recall, error revision, account export/delete path |
| E15 | Sync failures | offline pending queue + conflict resolution, no phantom saved state |
| E16 | Responsive UI | 320px phone, typical Android viewport, tablet, desktop, keyboard and screen readers, Bengali wrapping |
| E17 | Quotas | Worker request budget, Supabase size/egress guardrails, per-user provider spend controls, local pressure simulations |
| E18 | Build/deploy | Cloudflare Pages client build + admin build, Worker dev startup, documented deployment config |
| E19 | Low bandwidth | initial payload and unit fetching sane on throttled connection; graceful font fallback |
| E20 | Real external tests | live Supabase OAuth/email/RLS, Cloudflare deployed routing, Gemma and Llama response/rate; **BLOCKED until credentials** |

## Non-automated gates
- Editorial review of every potentially ambiguous/wrong English/Bengali instruction and C1 inference; specialist teacher review recommended. Automated structural QA cannot guarantee semantic correctness.
- Test with real Bengali-speaking beginners, check confusion points; inspect mobile screenshots, not just desktop.
- Verify source rights: original example text, linked external official teaching resources not scraped into corpus. Verify legal pages/data processor disclosures if public audience includes minors.
- Verify cloud free-tier quotas on user's actual accounts, paused DB risk and manual restore/backup; set alerts and transparent behavior.

## Completion reporting
`DONE` = implemented with automated test pass. `INTEGRATION VERIFIED` = actual live connected test successful. `BLOCKED` = cannot run without keys/account/service/teacher/real user (state exact reason). `KNOWN ISSUE` = failure not yet corrected. Final report includes test logs/dates, commands, unresolved issues and operational next steps. Major security/auth/content correctness failures block public release.
