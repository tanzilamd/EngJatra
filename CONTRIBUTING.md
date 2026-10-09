# Contributing

Read `AGENTS.md` and relevant specifications. Use Node 24.19.0, one npm lockfile, and `npm ci`. Run `npm run dev` for isolated mock accounts and `npm run qa` before review. `npm run test:production` checks production auth fails closed and public caching; run it when changing builds or the service worker.

Keep learning IDs stable, writing ungraded, Bangla student copy readable, and admin metadata private. Never move secrets into frontend variables. Add a forward migration after an applied schema change, test negative permissions, and document rollback. Private editorial queues belong in protected DB, not repository JSON.

New public fields require schema/allowlist and leak-test updates. Do not blindly publish all `content/source`. Use reviewed release artifacts; no default-branch push, production migration/deploy, DNS claim or paid upgrade without explicit owner authorization. Record decisions and actual test outcomes, distinguish local test coverage from live account verification.
