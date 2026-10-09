# EngJatra environment and external configuration inventory

Authoritative inventory, audited against actual source on 2026-10-09 (Asia/Dhaka). Deployment procedure: `docs/DEPLOYMENT_SIMPLE_BN.md` and `docs/CREDENTIALS_AND_DEPLOYMENT.md`. Never paste private values into Git/chat/logs. A secret saved in Codex is **not** copied to GitHub, Cloudflare or Supabase.

## Configuration status

The supplied public project URL is `https://ahxhhasraganuqspfqer.supabase.co`; this identifies a project, not permission or a verified integration. No application/Cloudflare secrets or runtime variables are observed ready in this Codex environment. Git transport and GitHub Actions run reads work: the main push started a verified workflow. GitHub Variables/Secrets administration reads returned **403 Resource not accessible by integration**, and `production` environment reads returned **404** (absent or inaccessible, not proved configured). Cloudflare/Supabase dashboards and saved values are **not accessible/unverified**, rather than assumed empty. A request to this project's Auth health endpoint was blocked by the session proxy (403). No credential values were inspected or printed.

Status shorthand below: **U** = destination inaccessible/unverified; absent from this session. **D** = explicit safe code default. **P** = provided public information, external behavior unverified. **T** = tool/platform-managed, not an application credential.

Verified GitHub run [37963190292](https://github.com/tanzilamd/EngJatra/actions/runs/37963190292) passed QA and stopped before uploads. Its redacted readiness annotation confirms **missing/invalid CI inputs** for `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `CONTENT_URL`, `ALLOWED_ORIGINS`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN`. Their dashboard values remain inaccessible; this proves the deploy job did not receive usable configuration, not that every dashboard field is blank. The remaining table statuses retain that distinction.

## Application, Worker and deployment values

Production is three independent Workers: `engjatra` student Static Assets, `engjatra-admin` admin Static Assets, `engjatra-api` protected API. GitHub Actions is the only production trigger. Configure the GitHub repository or its `production` environment at **Settings → Secrets and variables → Actions → Variables/Secrets**. The workflow maps the values below into builds and the API's additive secret upload; Codex secrets do not do that automatically.

| Variable | Purpose | Required? | Secret? | Where to get it | Where to set it | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser Auth project | Yes for cloud Auth/deploy | Public | Supabase project Connect/API settings; supplied URL above | GitHub Actions Variable; locally `.env` | P/U |
| `VITE_SUPABASE_ANON_KEY` | Browser Auth API key | Yes | Public publishable or legacy **anon** JWT, never secret/service-role/session key | Supabase Settings → API Keys | GitHub Actions Variable; locally `.env` | U |
| `VITE_API_URL` | Browser API origin | Yes for deployed sites; optional with local proxy | Public | Cloudflare API Worker overview after choosing account subdomain or approved custom domain | GitHub Actions Variable; locally `.env` | U |
| `SUPABASE_URL` | API Auth/REST origin | Yes for real backend | Public | Same project as frontend | Derived automatically from `VITE_SUPABASE_URL`; Cloudflare API runtime var. Local `workers/api/.dev.vars` | U |
| `SUPABASE_ANON_KEY` | API user-authorized REST/API key | Yes | Public key; managed as encrypted binding for transport/log hygiene | Same publishable/anon key as frontend | Derived from `VITE_SUPABASE_ANON_KEY`; uploaded as **API Worker secret**. Local `.dev.vars` | U |
| `ALLOWED_ORIGINS` | Exact student/admin CORS allowlist | Yes for browser API | Public | Actual two site origins | GitHub Actions Variable; API runtime var; local `.dev.vars` | U |
| `CONTENT_URL` | Student CDN origin; API lesson facts/release proof | Yes for deployment/AI/content proof | Public | Actual student Worker origin | GitHub Actions Variable; API runtime var; local `.dev.vars` | U |
| `ENVIRONMENT` | Production vs loopback local guard | Yes; managed | Public | Checked-in policy | Generated `production` on deploy; `local` in dev command / local `.dev.vars` | D |
| `LOCAL_DEMO` | Loopback-only fixture guard | Optional; production false | Public control, not authority | Code; not an account credential | Dev command sets true; real local `.dev.vars` false; deploy explicitly false | D |
| `GEMMA_API_KEY` | Google generateContent credential | Only if Gemma enabled | **Secret** | Google AI Studio API Keys, eligible project | GitHub Actions **Secret** → API Worker secret. Local `.dev.vars`/`.deploy.env` | U |
| `GEMMA_MODEL` | Compatible exact Google model ID | Only if enabled | Public server config | Current official model docs plus actual account availability | GitHub Actions Variable → API runtime var; local `.dev.vars` | U |
| `GEMMA_FREE_CONFIRMED` | Owner attests account/model free eligibility | Optional, false until verified | Public policy flag | Current official pricing, quota, privacy and account checks | GitHub Actions Variable → API runtime var | D/U |
| `LLAMA_API_KEY` | Independent Groq fallback credential | Only if Llama enabled | **Secret** | Groq Console API Keys | GitHub Actions **Secret** → API Worker secret. Local `.dev.vars`/`.deploy.env` | U |
| `LLAMA_MODEL` | Compatible exact Groq Llama ID | Only if enabled | Public server config | Groq supported models and account settings | GitHub Actions Variable → API runtime var | U |
| `LLAMA_FREE_CONFIRMED` | Owner attests fallback free eligibility | Optional, false until verified | Public policy flag | Groq account-specific free quota/terms | GitHub Actions Variable → API runtime var | D/U |
| `CLOUDFLARE_ACCOUNT_ID` | Select authorized account | Yes for publishing | Public identifier | Cloudflare account overview/sidebar account ID | GitHub Actions Variable; optional local `.deploy.env` | U |
| `CLOUDFLARE_API_TOKEN` | Upload only authorized Workers | Yes for publishing | **Secret** | Cloudflare Profile → API Tokens; account-scoped Workers Scripts Edit and required account read permissions | GitHub Actions **Secret**; optional local `.deploy.env`. Never a Worker or browser binding | U |

Public URL format: `https://<actual-host>` with no path, query or trailing slash. `ALLOWED_ORIGINS` is `<student-origin>,<admin-origin>`; `CONTENT_URL` must be the student origin, and API must use a separate origin. For workers.dev, hostnames must begin with the corresponding Worker name. Account ID is 32 hexadecimal characters. Keys: `<Supabase publishable/anon key>`, `<Google API key>`, `<Groq API key>`, `<account-scoped Cloudflare API token>`. Example files intentionally leave values blank; these descriptions are not working credentials.

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

## Additional actual tooling variables

These are not additional credentials needed by learners or the deployed API.

| Variable | Purpose/source | Required? / visibility / destination / status | Safe example and absence |
| --- | --- | --- | --- |
| `ENGJATRA_LIVE_API` | `scripts/smoke-live.ts`: optional operator read-only live check origin | Only for `smoke:live`; public; secure local/Codex/CI env; U | `<actual-api-origin>`; without it check reports NOT RUN |
| `ENGJATRA_SMOKE_TOKEN` | Same script: temporary real learner access JWT | Only for that check; **secret**; secure operator/session storage, never GitHub Variables or frontend config; U | `<short-lived learner JWT>`; no cloud login claim without test |
| `CHROMIUM_PATH` | Three Playwright configs: browser executable selection | Optional; public; local/CI env; T | `/usr/bin/chromium` here; empty uses installed Playwright browser |
| `CI` | `playwright.config.ts`: prevent reusing dev servers | Optional; platform boolean; GitHub runner automatically; T | `true`; local absence permits reuse |
| `GITHUB_ACTIONS`, `GITHUB_REF`, `GITHUB_SHA` | `scripts/deploy.ts`: verify a detached CI checkout is the authorized main commit; emit redacted readiness errors in Actions annotations | Automatic for CI; public platform metadata; T | `true`, `refs/heads/main`, `<full commit SHA>`; locally require checked-out main |
| `GITHUB_TOKEN` / `github.token` | Workflow SDK/download: read same-repo prior verified artifact | Automatic GitHub Actions credential; **secret**; GitHub only, contents/actions read; T/U | No manually saved personal token needed; API access from Codex remains separate |
| `GH_TOKEN` | Optional GitHub CLI authentication; existing runtime bootstrap | Not an app requirement; **secret**, platform/secure CLI; T/U | Keep managed credentials. Current transport/Actions reads work, but settings administration returns 403. Do not start login or replace a proxy placeholder to bypass policy. |
| `XDG_CONFIG_HOME` | `scripts/wrangler.ts`: portable config/cache path | Set internally, public path; T | `.wrangler/config`; no owner setup |
| `WRANGLER_SEND_METRICS` | Same wrapper: disable metrics | Set internally false; public flag; T | `false`; no owner setup |
| `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` | Managed environment networking; `node --use-env-proxy` respects session routes | Platform-managed; proxy URL may include sensitive auth; never copy to application bindings; T | Preserve inherited values/CA trust; do not bypass a denial |
| `OIC_MANIFEST_PATH` | Cloud runtime non-secret identity selector manifest | Platform-managed, not app runtime; T | Read selector metadata only. This session lists no outbound account identities. |

Vite's `MODE`/`PROD` are framework build metadata, not user environment variables. `--mode demo` is reserved for local development; never use it for publishing. Wrangler/SDK internals may read platform variables, but no extra database password, Supabase service-role, Google OAuth env, SMTP env, Pages token or GitHub personal token is required by EngJatra's application code.

## External dashboard fields (not application env variables)

| Configuration | Source → exact destination | Required / status / safe absence |
| --- | --- | --- |
| Cloudflare account Free and workers.dev subdomain | Cloudflare account → Workers & Pages/account subdomain | Required for default Worker hosts; U. Use actual assigned subdomain; no URL is reserved by code. |
| Worker names/config/build settings | Checked-in root `wrangler.jsonc`, admin config, API TOML → three matching targets | Locally validated. Disable native Workers Builds/Git automatic deployment for these targets once; Actions is authoritative. No Pages UI needed. |
| GitHub Actions enabled and main write permission | Repository Settings → Actions/General and Rules/Branches | Main push and matching workflow trigger verified; exact protection/settings inaccessible. Do not bypass protections. Production environment must not require recurring approvals if owner wants hands-off deploys. |
| Supabase migration application | Reviewed forward SQL → Supabase SQL Editor / approved migration tooling | Required; U. Inspect migration history and existing tables first, backup, apply **only missing** migration. Never disable RLS or rerun initial SQL blindly. |
| Owner UUID and staff role bootstrap | Verified Supabase Auth user UUID → protected `admin_memberships`, with audit | Required for admin use, not student first build; U. No email-domain/user-metadata role inference. |
| Supabase Site URL | Actual student origin → Authentication → URL Configuration | Required for reliable email redirects; U. Supplied project URL is not the Site URL. |
| Auth redirect allowlist | Exact student/admin root and recovery URLs → same URL Configuration | Required for email/OAuth/recovery; U. See deployment guide for code-generated targets and development-only entries. |
| Google OAuth Client ID/Secret | Google Cloud Console web OAuth client → Supabase Authentication → Sign In/Providers → Google | Optional for email-only deployment; private client secret; U. Never put either in Vite or Worker. Callback: `https://ahxhhasraganuqspfqer.supabase.co/auth/v1/callback`. |
| Google consent configuration/test users | Google Cloud Console → Google Auth Platform/OAuth consent screen | Required if enabling Google, U. Scopes/profile/privacy/domain and publishing policy need owner actions. |
| Email provider and confirmation/recovery policy | Supabase Auth → Email provider/settings | Required for email flows, U. Production delivery is not proven by a local form. |
| Verified sender/domain | Brevo Senders/Domains → Supabase Auth Email/SMTP sender fields | Needed for intended Brevo delivery; U. Configure actual verified sender; no invented address. |
| SMTP host/port/login/password | Brevo SMTP & API → Supabase Auth Email → SMTP settings | Host supplied: `smtp-relay.brevo.com`, port `587` with STARTTLS; username and **SMTP key/password**, not Brevo REST API key. U. No application SMTP integration or env needed. |
| Provider quotas/privacy/free eligibility | AI Studio and Groq account dashboards → owner confirmation + server flags | Optional AI, U. Google public pricing observed free Gemma 4 input/output and training use on free tier; that does not prove account/model access. Both flags remain off. |

Supabase publishable keys work under the existing `*_ANON_KEY` names. Managed deployment additionally rejects `sb_secret_` and JWTs with privileged or authenticated roles. Keep RLS enabled even with public keys.

## Storage boundaries

- **Codex Environment Secrets:** only this coding runtime; observed readiness must be checked. Not synced to any service. Approved network destinations also require a reviewed/published environment policy; a saved draft is not enforced access.
- **GitHub Actions Secrets:** deploy token and optional AI keys. Actions Variables: public configuration/account ID. Workflow securely injects each destination; no personal GitHub write token required.
- **Cloudflare Worker Secrets:** API keys/public Supabase key uploaded additively with the API version via `--secrets-file`; omitted secrets are retained, never blanked. Temporary secret file is ignored, mode 0600, removed in finally. Static Workers get no runtime secrets.
- **Cloudflare build variables:** unused by authoritative production Actions. Browser `VITE_` values must exist during Vite build, not merely in Worker runtime. If troubleshooting a disconnected native build, use the service-specific settings in the deployment guide and disable its competing trigger afterwards.
- **Supabase Dashboard:** OAuth secret, SMTP credentials, redirect settings, migration/owner administration. Not application env.
- **Local `.env` / `.dev.vars` / `.deploy.env`:** ignored copies of examples for browser, real local API, optional production deploy respectively. Do not load demo `.dev.vars` into a production deployment.

Official references inspected where accessible: [Cloudflare asset config](https://developers.cloudflare.com/workers/wrangler/configuration/#assets), [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Google Gemma API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api), [Google pricing](https://ai.google.dev/gemini-api/docs/pricing), [Groq models](https://console.groq.com/docs/models). Account and SMTP/OAuth integration checks remain unverified.
