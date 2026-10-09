# Autonomous maintenance and service permissions

Audit: **2026-10-10, Asia/Dhaka**. Preparation does not cancel/rerun jobs, apply SQL, change live bindings or enable paid services. A current owner deployment/push hold overrides ordinary main operations.

## Connection audit and least privilege

| Connection | Actual observation | Minimum permission / secure destination |
| --- | --- | --- |
| GitHub managed Git / CLI | Code/workflow Git operations and Actions/check reads work. Repository role metadata reports admin, but Variables/Secrets APIs return 403: role is not integration API scope. | Repository-only Contents/Workflows write; Actions write only for authorized reruns; Variables/Secrets write only if Codex administers settings; repository Environments read/write only if managing the production environment. Otherwise keep configuration owner-managed. Never replace injected bootstrap auth or request a PAT just because a settings API is denied. |
| Cloudflare | No ready account/token/provider identity in Codex. The latest observed GitHub deployment passed input readiness but failed later in deploy:all; actual token scope/live services are unverified. | Existing pipeline: account-scoped Workers Scripts Edit. Separate operator reads: Scripts Read; Tail Read only if log inspection is wanted, Account Settings Read only if discovery requires it. Secure connection/environment settings or existing Actions Secret. No billing/DNS/KV/R2 administration. |
| Supabase | No ready management credential/provider identity. Named public project Auth health returned 401 without a key: reachable, not authenticated. | Resource-restricted fine-grained Management token with `database_read` for catalog/history. `database_write` only for separately reviewed/authorized SQL. Inspect actual provider scope/resource support; a broad PAT is not automatically project-scoped. Secure `SUPABASE_ACCESS_TOKEN` in Codex or Actions Secret, never frontend/Worker. |
| Managed networking | Runtime policy state unknown; no outbound identities. Saved draft is separate from enforcement. | Review/publish approved API domains and actual live hosts. Preserve proxy/TLS. Do not infer access from a saved draft. |

Tokens saved in GitHub are not available to Codex. Monitoring reuses the pipeline token for GET-only Cloudflare requests; it never uploads/rotates secrets. A separate read-only operator token is preferable for direct diagnostics. No AI credentials/calls or new paid monitoring vendor.

## Monitoring and deployment verification

`Read-only Production Maintenance` runs daily at **08:17 Asia/Dhaka (02:17 UTC)** or manual dispatch, with contents/actions read, bounded requests and a ten-minute timeout. This repository is public; still watch Free Actions/artifact quotas and never enable spending. Native GitHub Actions failure notifications follow the owner's watch/preferences; no extra email/Slack integration. Scheduling is best-effort, not a real-time SLA.

Production remains solely `.github/workflows/ci.yml`. Maintenance has its **own concurrency group**: sharing production's could replace a pending deploy. Before selection and before/after probes it checks active/queued/waiting/pending/requested main production runs and defers without cancelling/rerunning/publishing. A deployment starting during probes yields no health conclusion.

Only a retained `production-release` archive from a successful main deployment is accepted. It contains both sites and the matching receipt. Checks cover archived SHA/Worker version IDs, HTML/SPA/headers, all 96 unit hashes, six libraries, public backend and anonymous authorization/CORS negatives. They compare against **the actual deployed archive, not latest main or a rebuilt unconfigured site**. Missing/expired archive fails as NOT VERIFIED; never fabricate a substitute. Existing production-student archives still retain immutable old lesson versions.

Commands: `npm run monitor:select`; `npm run monitor:check -- --artifact-root <verified archive> --expected-commit <archived SHA>`; `npm run maintenance:push-check`. The push guard observes GitHub only; inspect known native Cloudflare jobs separately when accessible. Recheck immediately before push. API denial is not idle proof.

Evidence: ignored `.wrangler/maintenance.local.json`, redacted check annotations/step summary and seven-day artifacts. Verified/deferred/blocked/not configured/not run are distinct. This does not verify real login/OAuth/SMTP/AI, full two-user RLS or cross-device sync. Missing DB access is explicitly reported separately.

API 5xx console diagnostics retain only coarse route, status, event and time; never raw URL/query, ID, request, header, token, learner/provider text or exception stack. Expected 4xx/auth failures are not logged. API configs use 10% head sampling with invocation logs disabled; sampling is not complete error accounting. Official Workers Logs docs currently include Free and announce pricing changes for December 2026: recheck the actual Free terms before activation/plan changes, never assume indefinite quotas or activate paid billing.

## Database migration management

- `npm run db:check`: checks committed SQL hashes in `supabase/migration-manifest.json` and rejects changes/deletions of SQL on fetched origin/main. QA includes it. New migrations are forward-only; preserve old hashes, add reviewed timestamp SQL/manifest entry and fresh/upgrade/RLS tests.
- `npm run db:plan -- --history <operator snapshot>` prepares ignored plan/review SQL; plain `db:plan` reads the configured project. Snapshots can be stale. Bundles are transaction-wrapped **review material, never automatically executed**. Old bundles are removed before a new attempt.
- `npm run db:audit`: reads only catalog names/RLS bits, migration versions and protected checksum metadata. Management requests always set `read_only: true`; no learner rows are read. The documented query API is beta/experimental; unexpected/denied contracts fail closed until actual account verification.
- Neither command/workflow applies SQL, resets schema, bootstraps roles/checksums, or bypasses RLS. Before an authorized write, verify live project/history, backup/restore, locks/data-loss/security review, fresh/upgrade tests; apply only reviewed missing SQL through approved project tooling and record true results after live checks.

Existing application schema without history blocks initial replay. Unknown/duplicate/out-of-order versions, edited/unverifiable hashes, missing app tables and disabled RLS block certification. Finding a version alone is not proof of matching SQL.

Owner-reviewed `supabase/operations/migration_checksums_bootstrap.sql` creates private `engjatra_ops.migration_checksums`, inaccessible to anon/authenticated and excluded from exposed API schemas. It certifies nothing automatically. Only after verifying actual history/original SQL does an operator record exact manifest version/hash pairs. No fake adoption; missing legacy hashes require one-time reconciliation, never replaying initial SQL. Record verified future migration hashes and rerun audit plus real Auth/RLS tests. Code revert does not roll back DB or delete progress.

## Incident procedure

Use the failed annotation and last verified receipt/archive. Classify transport/config, version drift, Auth/RLS, quota/provider or content failure. Gather minimal redacted diagnostics; prepare focused fixes/tests locally. Do not rerun unchanged failures, upgrade billing, weaken auth, reset DB or auto-delete/rollback learner data. Follow approved rollback in `CREDENTIALS_AND_DEPLOYMENT.md`. Wait for deployments/owner holds, fetch/sync main, QA, guarded non-force push and verify remote/workflow evidence.

## Cloudflare 504 investigation and safe recovery

Latest completed run 37975042622 passed configuration validation and failed in deploy:all. A 504 was reported by the owner; the detailed signed Actions log download and public status endpoint are unavailable through this session. No exact request, Cloudflare outage, API response code or root cause is asserted. A Vite build passing does not diagnose a deployment API timeout. Readiness validates token format, not account permissions.

Wrangler now records only exit code/gateway status in ignored `wrangler-result.local.json`, emits a safe gateway annotation and archives the diagnostic on failure. It never archives raw SDK output/secrets. Cloudflare **GET-only** verification retries 502/503/504 at most three times; 401/403 are not retried by that transport.

After a recognized publishing gateway failure, the deploy pipeline performs at most three active-version reconciliation reads. It continues only if the affected target has one 100%-active version tagged with the exact expected commit. It **does not repeat the upload**, rotate secrets, roll back or apply SQL. If acceptance is uncertain or another commit is active, it stops before the next target. Even successful reconciliation requires final all-target version, HTML/content/security verification before a success receipt is created.

`npm run deploy:recover` is a read-only recovery check against the configured current commit and built production artifacts; it publishes nothing. Operators/Codex restore authorized read access, inspect the safe diagnostic/current target versions and actual Cloudflare service health, then run configured build/recovery checks. Restore the approved immutable-content baseline before any subsequent authorized pipeline dispatch. Reconcile partial deployment and remote changes first; an old/missing tag or stale artifact is a blocker, never proof that the timed-out deployment changed nothing. An intentional rollback uses the verified previous code/artifact and normal guarded pipeline; it never resets learner data/database. Do not blindly rerun unchanged failures or deploy an unrelated Worker.

These local fault-injection tests demonstrate recovery behavior, not a successful recovery of the inaccessible production account. Automatic read retries and acceptance reconciliation are implemented; the original live failure still needs request-level evidence/account access.

## One short owner checklist

1. **GitHub:** authorize this repository's missing Variables/Secrets administration and Actions rerun scopes only if Codex should manage them; otherwise keep settings owner-managed. Enable normal Actions failure notifications.
2. **Cloudflare:** authorize an account-scoped secure connection for live inspection; deployment needs Workers Scripts Edit, operator reads Scripts Read, optional Tail Read. Stay Free, without billing/DNS administration.
3. **Supabase:** authorize resource-restricted database_read; database_write only for reviewed migration operations. Store the token securely in the intended Codex/Actions destination and reconcile legacy history/checksums before certifying them.
4. **Codex:** review/publish the saved network/startup draft and allow actual production hosts. No private values in chat.

Official references: [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [Supabase read-only Management query](https://supabase.com/docs/reference/api/v1-run-a-query). Configuration mapping: `docs/ENVIRONMENT_VARIABLES.md`.

Follow-up evidence: run 37980193033 passed remote QA and the publishing/version gates but failed final site verification with HTTP 404. No full success receipt exists and the exact site/root cause is not established. The pipeline now reads the actual account workers.dev subdomain before publishing and rejects mismatches with safe public expected origins. It never guesses/replaces custom domains or silently changes CORS/Auth settings. Homepage probes retry transient 404/gateway responses with bounded GETs and include the public host in errors. This is diagnostic/recovery preparation; account/route/real-user verification remains necessary.

When all publication/version gates pass but final verification fails, CI retains a separately labeled `publication-attempt` archive (both configured builds plus version/origin metadata). It is **not** selected by healthy monitoring or treated as a successful release/baseline. Operators/Codex can recover exact candidate static files, compare actual active versions and all live immutable-content hashes, inspect retained older versions and approve a baseline only after those checks. A missing historical artifact is not permission to replay/erase content or fabricate a successful receipt. This new evidence capture cannot restore ephemeral files from old failed runs that did not archive them.

## Verified account access and baseline recovery — 2026-10-10

The restarted Codex environment now has the seven core deployment inputs and Supabase Management token. Authenticated Cloudflare account/subdomain/active-version reads succeeded; all three enabled targets are on `nuvomi`, tagged d2d10dc7. Supabase read-only database audit found 18 tables with RLS enabled but no tracked history/checksum; no initial migration or ledger adoption was attempted. Authorized Auth URL configuration was corrected to actual production origins and reread, preserving email confirmation, Google and SMTP settings. These account observations supersede earlier missing-credential statements above. GitHub settings administration remains denied; Codex Worker-host egress needs publication of the saved exact-domain draft.

`.github/workflows/recovery.yml` is a **read-only verifier**, not a second publishing mechanism. On a recognized completed CI failure with successful QA, or authorized manual dispatch, it checks production is idle, all targets have the same unambiguous source tag, and that source is an ancestor of trusted main. It rebuilds that exact source in an isolated runner directory, retains any verified older content archive, and checks stable version IDs, every public file's binary SHA, SPA/headers/CORS/anonymous negatives and Supabase readiness. Only then does it upload `production-student` plus a separately labeled recovery receipt. It never invents a `production-release` receipt, uploads Workers, changes secrets, applies SQL or erases content. Unknown/expired history or hash drift stops recovery. Automatic recovery occurs at most once per failed commit; successful recovery dispatches **only ci.yml on main**, with Actions write scoped to that resume job. Checks read is required for failed-step annotation classification.

Publishing also rejects newer/divergent or untagged active source and rechecks target IDs immediately before each upload. If all targets already run the current commit, exact artifact/security verification produces a receipt **without duplicate uploads**; a mismatch stops rather than blindly republishing. `npm run test:live:browser` uses actual public origins without mocks to check desktop/mobile render, fonts/branding/CSS/Bangla, accessibility, Auth UI, SPA reload and resource/browser errors. It explicitly excludes real email/OAuth, authenticated lesson/progress, positive staff operations and provider calls until those are separately tested. No login state or browser trace is archived by this public check.
