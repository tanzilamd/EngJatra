# Credentials to configure LATER (no values in repository)

The owner will supply/cloud-configure these after credential-independent implementation. This is the original visibility checklist; use `docs/CREDENTIALS_AND_DEPLOYMENT.md` for the implemented bindings and exact activation procedure. No service-role key is currently required.

| Item | Visibility | Typical location | Required for |
|---|---|---|---|
| Supabase project URL | Public config (not secret) | GitHub Actions Variable / Vite build env `VITE_SUPABASE_URL` | Client auth/data access |
| Supabase publishable/anon key | Public config (RLS still mandatory) | GitHub Actions Variable / Vite build env `VITE_SUPABASE_ANON_KEY` | Supabase client |
| Supabase role/privileged key (only if architecture truly needs it) | SERVER SECRET | Worker secret, never in browser | Protected server tasks |
| Optional external SQL tool DB URL/password | LOCAL SECRET, only if that tool is used | Approved operator SQL tool, never commit | Not needed for npm/PGlite migration/RLS tests |
| Google OAuth client configuration | Platform secret/settings | Supabase Auth provider configuration | Google sign-in |
| Cloudflare account and 3 Workers | Access, not text in repo | GitHub Actions plus Cloudflare account | Production deploy |
| Gemma API key & proven current model ID | SERVER SECRET | Cloudflare Worker secret | Primary written tutor |
| Free Llama provider key & proven current model ID | SERVER SECRET | Cloudflare Worker secret | Independent fallback |
| Authorized first admin user UUID | Restricted setting | Secured Supabase bootstrap procedure | Privileged staff role |

No credentials belong in this document; put only **names and instructions**. `VITE_*` is exposed in browser bundles; no API service key or Supabase service-role key may use it. Rotate keys immediately if accidentally exposed. Production smoke tests remain BLOCKED until actually configured, and no provider availability or live domain is guaranteed until checked.

Cloudflare Worker secrets official docs: https://developers.cloudflare.com/workers/configuration/secrets/
