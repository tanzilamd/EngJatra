# QA Matrix & Definition of Done (DoD) — EngJatra

## Evidence rule

Never report “fully correct”, “100% error-free”, “production verified”, or “expert verified” without real evidence. Continue development and rerun tests after every fix. File failures as defects with reproduction, severity and passing regression tests. External service unavailability is BLOCKED, not PASSED. Maintain traceable `docs/STATUS.md` with outcomes.

## Required automated scripts (implement and run)

- `npm run lint`
- `npm run typecheck`
- `npm run test` (unit/integration)
- `npm run test:content` (counts, schema, refs, public metadata strip, answer consistency, duplicates)
- `npm run test:docs` (local documentation links/specifications, executable npm commands, public environment names and retired prompt references)
- `npm run test:e2e` (browser, student/admin flows)
- `npm run test:auth-ui` (explicit local Auth mocks, truthful failures, recovery and light/dark responsive screenshots; not external email/OAuth verification)
- `npm run test:production` (real production artifacts, normal-profile PWA installability, public-only caching and offline reload)
- `npm run build` (both deployable sites/server functions and assets)
- `npm run test:deployment` (actual Wrangler Static Assets SPA/content/headers/production auth browser checks)
- `npm run deploy:check -- --offline` (three explicit target dry runs; not external readiness)
- `npm run qa` to combine all reliably; may use other commands if documented and reproducible.
- `npm run test:live:browser`, `npm run test:live:auth` and `npm run test:performance` after an authorized release. The controlled Auth check verifies actual offline cached-lesson reload and reconnect persistence, and creates/cleans only disposable learner/reviewer fixtures; its confirmation bypass does not test email delivery. Performance uses two cold samples per viewport, 4x CPU and 1.6 Mbps/150ms network conditions; click-to-frame latency is not field INP.
- RLS tests: local Supabase CLI/Docker if available; otherwise contract tests and explicitly blocked live RLS tests.

## Minimum scenario matrix

| ID  | Scenario              | Expected evidence                                                                                                        |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| E01 | New absolute beginner | within a few minutes first valid English sentence using Bengali scaffolding; 3-step tour skippable                       |
| E02 | Returning learner     | server-confirmed checkpoint resumes after refresh; cross-device verified once backend available                          |
| E03 | Content availability  | all 96 authored unit IDs load lazily; 6 bands; malformed/missing JSON produces useful error                              |
| E04 | Offline lessons       | reading, vocabulary, detective, scripted mission, sentence builder, mistakes available when AI disabled                  |
| E05 | Answer correctness    | all objective keys in range, no duplicate choices, valid alternatives allowed, writer rubric not exact-string graded     |
| E06 | Content leak test     | zero prohibited editorial/review/status fields in public JSON, assets, APIs, DOM                                         |
| E07 | AI healthy            | correct text-only level-sensitive response, short Bangla explanation, structured validation                              |
| E08 | AI graceful failures  | valid primary, rate-limited primary -> fallback, all providers down -> offline exercise, no lost progress                |
| E09 | 429 classification    | only distinguish RPM/TPM/daily if verified, unknown stays unknown, no fabricated reset time                              |
| E10 | No secrets            | public/client assets and returned errors contain no secret keys; no auto paid path                                       |
| E11 | User private data     | two users cross-read/write denied by RLS + API; expired sessions rejected                                                |
| E12 | Admin authorization   | unauthorized staff dashboard/API denied; forged memberships rejected; audited privileged change                          |
| E13 | Editorial lifecycle   | learner report with item+release -> admin queue -> revision -> publish confirmation -> rollback; no false publish toast  |
| E14 | History/mistakes      | pagination, saved words, spaced recall, error revision, account export/delete path                                       |
| E15 | Sync failures         | offline pending queue + conflict resolution, no phantom saved state                                                      |
| E16 | Responsive UI         | 320px phone, typical Android viewport, tablet, desktop, keyboard and screen readers, Bengali wrapping                    |
| E17 | Quotas                | Worker request budget, Supabase size/egress guardrails, per-user provider spend controls, local pressure simulations     |
| E18 | Build/deploy          | Worker Static Assets client build + admin build, Worker dev startup, documented deployment config                        |
| E19 | Low bandwidth         | initial payload and unit fetching sane on throttled connection; graceful font fallback                                   |
| E20 | Real external tests   | live Supabase OAuth/email/RLS, Cloudflare deployed routing, Gemma and Llama response/rate; **BLOCKED until credentials** |

## Non-automated gates

- Inspect real browser screenshots across Auth, onboarding, home, paths, lessons/activities, all library tabs, review/progress, settings, install/offline and all six admin workflows. Exercise both themes at 320/390/768/1440px, plus Auth at 375/1024px. Check native dialog keyboard focus, navigation/button geometry and axe violations. Browser installability is separate from physical Android/iOS installation and update verification.
- Editorial review of every potentially ambiguous/wrong English/Bengali instruction and C1 inference; specialist teacher review recommended. Automated structural QA cannot guarantee semantic correctness.
- Test with real Bengali-speaking beginners, check confusion points; inspect mobile screenshots, not just desktop.
- Verify source rights: original example text, linked external official teaching resources not scraped into corpus. Verify legal pages/data processor disclosures if public audience includes minors.
- Verify cloud free-tier quotas on user's actual accounts, paused DB risk and manual restore/backup; set alerts and transparent behavior.

## Completion reporting

`DONE` = implemented with automated test pass. `INTEGRATION VERIFIED` = actual live connected test successful. `BLOCKED` = cannot run without keys/account/service/teacher/real user (state exact reason). `KNOWN ISSUE` = failure not yet corrected. Final report includes test logs/dates, commands, unresolved issues and operational next steps. Major security/auth/content correctness failures block public release.

## Final launch additions

Regression QA covers confirmation resend pacing/provider 429/email correction, safe expired/reused callbacks, return-to-login recovery, unconfirmed-session denial and provider-confirmed Google session routing. Explicit mocks are not actual Google consent. Delayed-SDK first-paint QA must show a rendered public heading and disabled actions before initializing the single client; offline production reload must include its new lazy chunk.

Protected live QA additionally verifies an unconfirmed disposable password identity is denied, provider-issued signup token single use, provider recovery/password replacement, the seven authored P0-01 activities, unique completion, saved vocabulary, revision schedule and next-unit restore. It sends no mail to uncontrolled inboxes and never edits real accounts. AI metadata GET verifies only authentication/model compatibility. Delivery, real Google consent, real inference/free eligibility and physical-device installation remain separate release gates.

Library supplement regression gates: exact sentence/sense anchoring, existing examples protected, duplicate/private/unknown additions rejected, original library immutable and all 96 copied unit bytes identical. The collection must display new grammar translations using the current manifest while leaving an unfinished lesson’s saved release unchanged. Reports from that collection must carry the displayed release. Unit/export verification tests derive versions from the actual manifest and retain wrong-version/tampered rejection checks.

Source unit publishing additionally exercises the real preparation CLI and exporter, verifying prepared-only status, exact baseline hash, unchanged activity/saved-word identities, old-byte retention and new manifest hashes, with stale/duplicate/private/overwrite rejection. The sample generated unit edit is temporary test data, never an actual teaching release.

## Adult-only AI activation regression gates

Check unacknowledged/private-context/unavailable-country requests make zero quota/provider calls; client country headers must never grant access. Require a reviewed regional subset for enabled Gemma, nonempty Bengali explanation and English response/question, correct lesson ID and credential/contact-output rejection. Verify four/minute, twenty/user/day and two hundred/site/day PostgreSQL limits without counter increments on rejection or direct learner reset privileges. Browser coverage must retain failed text, prevent in-flight edits/duplicate submits, carry bounded context and inspect consent/chat/focus layouts in both themes at mobile/desktop widths with axe.

Only after explicit account/terms/free eligibility may `ai:check` run its two synthetic inference cases. When enabled, controlled production Auth QA must exercise one actual bilingual tutor correction with a temporary authenticated identity; metadata/mock/false-flag runs must continue reporting inference untested. Never exhaust live quotas deliberately, submit personal data, enable billing or weaken region checks to pass remote QA.
