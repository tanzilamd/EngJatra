# EngJatra environment and external configuration inventory

Authoritative inventory, audited against actual source on 2026-10-10 (Asia/Dhaka). Deployment procedure: `docs/DEPLOYMENT_SIMPLE_BN.md` and `docs/CREDENTIALS_AND_DEPLOYMENT.md`. Never paste private values into Git/chat/logs. A secret saved in Codex is **not** copied to GitHub, Cloudflare or Supabase.

## Configuration status and dated evidence

Audited **2026-10-10 (Asia/Dhaka)** against application/Worker sources, scripts, examples, Wrangler, workflows, Playwright and managed runtime readiness. No values were printed. Git transport/run/check reads work. GitHub Variables/Secrets administration returns **403 Resource not accessible by integration** despite repository admin metadata. Runtime reports no configured application secrets, variables or outbound provider identities. These are different permission layers.

Latest observed completed run [37975042622](https://github.com/tanzilamd/EngJatra/actions/runs/37975042622) passed QA **and configuration readiness**, then failed in `deploy:all`. The owner reported a Cloudflare 504; detailed log download is denied by the session proxy. Therefore the seven core CI inputs below were usable for readiness, while their values, token scope, actual uploads and live behavior remain unverified. Earlier missing-input run evidence is historical. The named Supabase Auth endpoint now returns **401 without a key**, proving reachability only.

**CI** means GitHub Settings → Secrets and variables → Actions (repository or `production` environment). **Codex** means secure environment configuration, not chat. **CF** means the API Worker's runtime bindings. Configuration does not transfer between these destinations automatically. Production has three separate Workers and GitHub Actions is the only publishing trigger.

## Complete autonomous maintenance configuration and access table

This is the consolidated setup table. Public values belong in Variables; secret values belong in Secrets. A status of **unverified** is not a claim that the dashboard is empty. Platform entries require no owner-created credentials. Dashboard fields/permissions are explicitly not environment variables.

| Exact name / configuration | Required or optional | Where to obtain it | Where to configure it | Already configured or missing | Functionality enabled |
| --- | --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Required for cloud Auth/deploy; public | Supabase Connect/API; supplied project URL above | CI Variable; Codex runtime variable for direct checks; local `.env` | CI readiness valid; missing Codex binding; live unverified | Browser Auth; selects audited project |
| `VITE_SUPABASE_ANON_KEY` | Required; **public publishable/anon**, never privileged key | Supabase Settings → API Keys | CI Variable; Codex variable; local `.env` | CI readiness valid; missing Codex; live unverified | Browser Auth and user-authorized data |
| `VITE_API_URL` | Required for production; public | Actual `engjatra-api` Worker overview/origin | CI Variable; Codex variable; local `.env` | CI readiness valid; missing Codex; live URL unverified | Browser/API routing and CSP |
| `CONTENT_URL` | Required for deploy/content-backed API; public | Actual student `engjatra` origin | CI/Codex Variable → CF runtime var; local `.dev.vars` | CI readiness valid; missing Codex; CF upload unverified | Static learning content/API facts/monitoring |
| `ALLOWED_ORIGINS` | Required production; public | Exact actual student and admin origins | CI/Codex Variable → CF runtime var; local `.dev.vars` | CI readiness valid; missing Codex; CF upload unverified | Exact CORS and admin origin selection |
| `CLOUDFLARE_ACCOUNT_ID` | Required publishing/live version checks; public identifier | Cloudflare account overview | CI/Codex Variable; local ignored `.deploy.env` | CI readiness valid; missing Codex | Targets correct account |
| `CLOUDFLARE_API_TOKEN` | Required publishing/live version checks; **secret** | Cloudflare Profile → API Tokens; scoped account | CI/Codex **Secret**; never CF/browser binding | CI format valid; missing Codex; actual scope unverified | Worker deployments, reconciliation, read-only monitoring |
| `SUPABASE_URL` | Required backend; public, derived | Same as `VITE_SUPABASE_URL` | Deploy derives CF var automatically; local `.dev.vars` | Mapping implemented; live CF binding unverified | Server Auth/REST transport |
| `SUPABASE_ANON_KEY` | Required backend; public key transported securely, derived | Same as `VITE_SUPABASE_ANON_KEY` | Deploy → CF encrypted secret; local `.dev.vars` | Mapping implemented; live CF binding unverified | User-authorized server REST; no service-role bypass |
| `ENVIRONMENT` | Required backend; public control | Code | Deploy fixes CF var to `production`; local `.dev.vars` uses `local` | Safe source configuration; live unverified | Production/local security guards |
| `LOCAL_DEMO` | Optional local only; production false | Code | Deploy fixes CF var false; dev command/local `.dev.vars` | Safe default/source; live unverified | Explicit loopback-only fixtures |
| `GEMMA_API_KEY` | Optional; required only enabled Gemma; **secret** | Google AI Studio API Keys, eligible project | CI Secret → CF Secret; Codex Secret only for direct provider tests | Missing Codex; CI/CF unverified | Primary eligible Google Gemma tutor |
| `GEMMA_MODEL` | Optional; required if enabled; public server config | Current Google model docs and account access | CI Variable → CF var; Codex/local if testing | Missing Codex; CI/CF unverified | Exact compatible model selection |
| `GEMMA_FREE_CONFIRMED` | Optional; false until verified | Owner verifies current account/model quota/pricing/privacy | CI Variable → CF var | False fallback in code; remote override unverified | Explicit free-only activation gate |
| `LLAMA_API_KEY` | Optional; required only enabled fallback; **secret** | Groq Console API Keys | CI Secret → CF Secret; Codex Secret only for direct provider tests | Missing Codex; CI/CF unverified | Independently eligible Groq Llama fallback |
| `LLAMA_MODEL` | Optional; required if enabled; public server config | Groq supported models/account | CI Variable → CF var; Codex/local if testing | Missing Codex; CI/CF unverified | Compatible fallback model |
| `LLAMA_FREE_CONFIRMED` | Optional; false until verified | Owner verifies account-specific free quota/terms | CI Variable → CF var | False fallback in code; remote override unverified | Free-only fallback activation |
| `SUPABASE_ACCESS_TOKEN` | Optional app/deploy; required live DB management; **secret** | Supabase resource-restricted fine-grained Management token | Codex Secret; CI Secret for scheduled `db:audit`; ignored local `.deploy.env` | Missing Codex; CI unverified | Read-only catalog/history/checksum/RLS audit; reviewed writes require separate permission |
| `ENGJATRA_LIVE_API` | Optional, required `smoke:live`; public | Actual API origin | Codex/operator runtime; not Worker binding | Missing Codex | Real authenticated learner smoke checks |
| `ENGJATRA_SMOKE_TOKEN` | Optional, required `smoke:live`; **secret short-lived learner JWT** | Real test learner sign-in through Supabase | Secure Codex/operator session only; never public Variable | Missing Codex | Learner access and negative admin tests; not owner/admin credential |
| `GH_TOKEN` | Managed CLI auth needed for maintenance guard; **secret** | Managed GitHub connection | Already injected Codex; maintenance CI sets from `github.token` | Present; code/run reads work; settings scope denied | Git/run/artifact reads; no additional PAT required |
| `GITHUB_TOKEN` / `github.token` | Automatic Actions; **secret** | GitHub runner | Automatic workflow token, contents/actions read | Generated per runner; not a persistent Codex binding | Same-repo artifact download/GitHub SDK |
| `GITHUB_ACTIONS` | Automatic CI metadata | GitHub runner | Automatic CI env | Runner-managed | Redacted annotations and detached main guard |
| `GITHUB_REF` | Automatic CI metadata | GitHub runner | Automatic CI env | Runner-managed | Restricts publishing to `refs/heads/main` |
| `GITHUB_SHA` | Automatic CI metadata | GitHub runner | Automatic CI env | Runner-managed | Matches checkout/QA/deploy commit |
| `GITHUB_OUTPUT` | Automatic CI path | GitHub runner | Automatic CI env | Runner-managed | Archived release selection/deferred outputs |
| `GITHUB_STEP_SUMMARY` | Automatic CI path | GitHub runner | Automatic CI env | Runner-managed | Redacted maintenance evidence |
| `VERIFIED_COMMIT` | Generated maintenance metadata | Successful archive/run matching SHA | Workflow step env, not owner setting | Generated only after verified archive exists | Probes actual deployed SHA rather than latest main |
| `CHROMIUM_PATH` | Optional local browser path | Installed Chromium | Local/Codex; CI uses blank to select Playwright browser | Unset; local `/usr/bin/chromium` default verified | Browser/accessibility QA |
| `CI` | Automatic/optional flag | Runner | CI env; optional local | Runner-managed; absent local | Prevents test dev-server reuse |
| `XDG_CONFIG_HOME` | Internal path; no credential | Wrangler wrapper | Set internally to ignored `.wrangler/config` | Implemented | Writable portable Wrangler configuration |
| `WRANGLER_SEND_METRICS` | Internal control; no credential | Wrapper | Set internally false | Implemented | Disables Wrangler metrics |
| `HTTP_PROXY` | Managed transport; URL may be sensitive | Codex platform | Automatic Codex env; preserve | Present | Authorized outbound proxy |
| `HTTPS_PROXY` | Managed transport; URL may be sensitive | Codex platform | Automatic Codex env; preserve | Present | Authorized HTTPS proxy |
| `NO_PROXY` | Managed routing | Codex platform | Automatic Codex env; preserve | Present | Correct approved local transport |
| `OIC_MANIFEST_PATH` | Managed non-secret identity selector path | Codex platform | Automatic Codex env | Present; identity list empty | Declared outbound account identities; currently none |
| `NODE_EXTRA_CA_CERTS` | Managed TLS trust; not app config | Codex platform | Automatic Codex env; preserve | Present | Node trusts session proxy CA |
| `SSL_CERT_FILE` | Managed TLS trust; not app config | Codex platform | Automatic Codex env; preserve | Present | System/client CA trust |
| `REQUESTS_CA_BUNDLE` | Managed TLS trust; not app config | Codex platform | Automatic Codex env; preserve | Present | Python requests CA trust |
| `CURL_CA_BUNDLE` | Optional managed TLS override; not app config | Codex platform if supplied | Automatic Codex env, never invent/override | Not set; system trust applies | Optional curl-specific trust |
| GitHub Contents/Workflows permissions (not env) | Required routine code/workflow push | Repository owner → installed Codex/GitHub connection | GitHub connection restricted to `tanzilamd/EngJatra`; honor main protections | Git works; workflow push must be verified | Direct-main maintenance and versioned automation |
| GitHub Actions read/write (not env) | Read required; write only if authorized dispatch/reruns | Owner connection permissions | GitHub/Codex connection | Reads work; write unverified | Observe CI; optional recovery dispatch without owner terminal work |
| GitHub Variables/Secrets write (not env) | Optional; required if Codex manages settings | Owner connection installation | GitHub/Codex repository connection; do not replace bootstrap auth | Administration APIs deny 403 | Configure CI inputs without repeated owner dashboard edits; cannot read saved secret plaintext |
| GitHub Environments read/write (not env) | Optional; required if Codex manages the production environment | Owner connection permission, limited to this repository | GitHub/Codex connection; no protection bypass | Environment administration access unverified/inaccessible | Inspect/configure production environment and its settings without broad organization access |
| Cloudflare Workers Scripts Read/Edit (not env) | Read for audit; Edit for deployment | Token account resource/permissions | Token used in Codex/CI Secret | Runtime absent; CI scope unverified | Inspect versions; deploy three distinct Workers |
| Cloudflare Workers Tail Read (not env) | Optional direct log inspection | Scoped Cloudflare token | Codex secure connection/token only if needed | Unverified | Diagnose live Worker failures; no billing/DNS permissions needed |
| Supabase `database_read`/`database_write` (not env) | Read for audit; write only reviewed authorized migrations | Fine-grained token resource permissions | Codex token; CI audit read-only preferred | No runtime token; remote history unverified | Inspect history/RLS; apply reviewed missing SQL through approved tooling, never automatic resets |
| Supabase Auth configuration permissions (not env) | Optional operator automation; required if Codex changes Auth settings | Owner grants provider-supported project Auth/settings scopes | Secure Supabase/Codex connection | Not connected/unverified | Manage redirects/provider policy with owner authorization; no broad organization role assumed |
| Workers Free / workers.dev subdomain / native Builds disabled (not env) | Required default hosting and single trigger | Cloudflare Workers account | Cloudflare dashboard | Unverified | Correct three origins; prevents competing native deploys |
| Supabase Site URL / redirect allowlist (not env) | Required cloud email/OAuth/recovery | Actual student/admin origins and code redirects | Supabase Authentication → URL Configuration | Unverified | Safe email/OAuth/recovery redirects |
| Supabase Email provider / confirmation/recovery policy (not env) | Required email Auth | Supabase Auth Email settings | Supabase dashboard/authorized Auth connection | Unverified | Email registration, confirmation and password recovery |
| Google OAuth Client ID (not env) | Optional Google login; public client identifier | Google Cloud web OAuth client | Supabase Authentication → Providers → Google | Unverified | Google login configuration |
| Google OAuth Client Secret (not env) | Optional Google login; **secret** | Same Google Cloud client | Supabase Google provider only; never Vite/Worker | Unverified | Provider exchange; callback given below |
| Google OAuth consent/test users (not env) | Required if Google enabled | Google Cloud → Google Auth Platform | Google Cloud dashboard/authorized connection | Unverified | Allowed OAuth audiences and consent |
| Brevo SMTP username / password (not env) | Required intended custom email delivery; **password secret** | Brevo SMTP & API → SMTP credentials (not REST key) | Supabase Auth → Email → SMTP only | Unverified | Confirmation/recovery delivery |
| Brevo verified sender / SMTP host / port (not env) | Required if using Brevo | Verified Brevo sender; `smtp-relay.brevo.com`, `587` STARTTLS | Supabase SMTP sender/server fields | Host/port supplied; actual config/delivery unverified | Trusted sender and delivery transport |
| Owner UUID / `admin_memberships` (not env) | Required admin activation | Verified Supabase Auth owner account | Protected database bootstrap with audit | Unverified | Server-authoritative staff/owner roles |
| Migration history / private checksum ledger (not env) | Required live schema certification | Reviewed deployed SQL/history/backup | Supabase protected history and `engjatra_ops`; never expose REST schema | Unverified; local hash checks pass | Safe pending-migration plans; prevents initial replay/fake adoption |
| Codex network policy publication (not env) | Required denied service/log destinations | Review saved onboarding draft | Codex environment configuration | Draft saved, requires publication; runtime restricted/unknown | APIs, signed Actions log downloads and actual live hosts; not credential forwarding |

Minimum connected operation uses **seven CI inputs**, already accepted by the latest readiness check. For direct autonomous diagnostics bind the same public values and scoped Cloudflare credential separately in Codex, grant the missing GitHub administration scope only if delegated, and add restricted Supabase audit access. AI and OAuth credentials are optional activation tasks. Full A–Z account changes still depend on provider-supported scopes and owner consent; no code or token can remove Google consent/sender verification/account ownership steps.

Public origins use `https://<actual-host>` with no path/query/trailing slash. `ALLOWED_ORIGINS` has exactly `<student-origin>,<admin-origin>`; `CONTENT_URL` is the student origin, API uses a third origin. Worker hostnames must match their names; account ID is 32 hex characters. Examples remain blank or safe defaults, never actual credentials.

### Source, phase, first-deploy and missing-value behavior

| Values | Actual use / phase | First deployment and safe absence |
| --- | --- | --- |
| Three `VITE_` values | `packages/data/client.ts`: browser build; Vite `envDir` is repository root. `scripts/export-content.ts` also adds exact API origin to CSP. `scripts/deployment-config.ts` validates deploy inputs | Required for connected production. Blank Auth fields show setup-required; blank API URL is a local proxy only. Managed deploy refuses blanks. No frontend runtime secret injection is supported. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | `workers/api/src/supabase.ts`: runtime Auth user verification, REST/RPC; deploy derives both from validated frontend config | Required for real backend. Missing backend fails closed; anonymous REST sends `apikey` without treating a publishable key as a JWT. Authenticated REST also sends the **user session JWT**. |
| `ALLOWED_ORIGINS`, `ENVIRONMENT`, `LOCAL_DEMO` | `workers/api/src/index.ts`: runtime CORS/demo guard. `scripts/deployment-config.ts` ensures conservative production values | Production allowlist required. Missing allowlist denies browser origins; mock headers cannot grant roles. Loopback fixtures require both local flags and localhost. Never enable demo on a remote Worker. |
| `CONTENT_URL` | `workers/api/src/index.ts`: scoped static facts and deployed content hashes | Required for publishing readiness. Blank value disables content-backed AI/release proof; authored site content still exists, but managed deployment refuses incomplete configuration. |
| Six AI values | `workers/api/src/ai.ts`: Google/Groq HTTPS calls; `scripts/deployment-config.ts`: flag/model/key consistency | Not required for first deployment. Missing/disabled provider yields authored no-AI continuation. A true flag requires key and compatible model; no automatic paid fallback. Each provider is independent. |
| Two Cloudflare values | `scripts/deploy.ts`, `scripts/deployment-config.ts`, `scripts/deployment-verify.ts`, `.github/workflows/ci.yml`: **deploy-time only** | Required before live publishing. Not required for local build, three dry runs, demo or DB tests. Missing credentials stop publishing before any remote mutation. |

Real-auth development uses `.env` plus `workers/api/.dev.vars` and `npm run dev:live`; fixture development uses `npm run dev` without credentials. Preview **builds** use their own public Supabase/API origins and exact CORS/Auth redirects, never demo production bundles. This workflow does not automatically provision preview backends or publish feature branches; only `main` is production. A future preview implementation must explicitly add isolated configuration and tests. Do not reuse a production binding blindly for preview.

## Tooling boundaries

Vite `MODE`/`PROD` are framework build metadata, not user credentials. `--mode demo` is local-only. No extra database password, Supabase service-role, OAuth application env, SMTP app env, Pages token or personal GitHub token is required by EngJatra code. The TLS/proxy rows above are observed platform configuration, not new project requirements. Provider SDK internal controls are not owner-created application variables.

## External dashboard verification details

For Google login the callback is `https://ahxhhasraganuqspfqer.supabase.co/auth/v1/callback`; application allowlists must use actual deployed student/admin/recovery targets. The supplied project URL is not the Supabase Site URL. Confirm production email delivery and OAuth with real end-to-end tests. SMTP uses Brevo's SMTP key/password, not its REST API key; no application SMTP integration is needed.

Google public pricing observed eligible free Gemma input/output and training use on free tier, but public documentation does not prove actual account/model access. Groq fallback eligibility is independent. Keep each flag false until its account/model's current pricing, quota, privacy and access are verified. Native Cloudflare Builds must be disconnected from these targets so they do not compete with the sole Actions production trigger. A production GitHub environment must not add repeated owner approvals if hands-off operation is desired; protections must still be honored.

Supabase publishable keys work under the existing `*_ANON_KEY` names. Managed deployment additionally rejects `sb_secret_` and JWTs with privileged or authenticated roles. Keep RLS enabled even with public keys.

## Storage boundaries

- **Codex Environment Secrets:** only this coding runtime; observed readiness must be checked. Not synced to any service. Approved network destinations also require a reviewed/published environment policy; a saved draft is not enforced access.
- **GitHub Actions Secrets:** deploy token and optional AI keys. Actions Variables: public configuration/account ID. Workflow securely injects each destination; no personal GitHub write token required.
- **Cloudflare Worker Secrets:** API keys/public Supabase key uploaded additively with the API version via `--secrets-file`; omitted secrets are retained, never blanked. Temporary secret file is ignored, mode 0600, removed in finally. Static Workers get no runtime secrets.
- **Cloudflare build variables:** unused by authoritative production Actions. Browser `VITE_` values must exist during Vite build, not merely in Worker runtime. If troubleshooting a disconnected native build, use the service-specific settings in the deployment guide and disable its competing trigger afterwards.
- **Supabase Dashboard:** OAuth secret, SMTP credentials, redirect settings, migration/owner administration. Not application env.
- **Local `.env` / `.dev.vars` / `.deploy.env`:** ignored copies of examples for browser, real local API, optional production deploy respectively. Do not load demo `.dev.vars` into a production deployment.

Official references inspected where accessible: [Cloudflare asset config](https://developers.cloudflare.com/workers/wrangler/configuration/#assets), [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Google Gemma API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api), [Google pricing](https://ai.google.dev/gemini-api/docs/pricing), [Groq models](https://console.groq.com/docs/models). Account and SMTP/OAuth integration checks remain unverified.
