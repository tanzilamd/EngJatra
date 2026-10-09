# Protected Admin Panel — workflows, permissions and publishing

## Admin scope
Dedicated admin UI (separate Cloudflare Static Assets Worker with different hostname), sharing EngJatra visual language but using calm tables, filters, clear forms. **Server and Supabase RLS are the security boundary**, not front-end hidden nav. Default-deny all privileged operations.

## Roles
- `learner`: personal learning/report only; never review metadata or other profiles.
- `content_reviewer`: can view research notes and evaluate content/reports; limited safe editorial actions, no security settings.
- `content_editor`: create/revise content drafts, prepare release; cannot grant admin roles.
- `admin`: approve/publish/rollback content, review reports, support limited user operations, view quota and audit. For sensitive user deletion/role promotion require explicit additional verification/owner action.
- `owner`: manually bootstrapped through securely documented process, can manage admin grants.
Prevent privilege escalation via editable profile/metadata/JWT claims. Allowlist roles on server and RLS. Do not infer role from email name/domain alone. Audit all privileged mutations.

## Features
1. Dashboard: content counts by unit/band, reports status, recent correction actions, provider health, quota capacity (observed only), storage/egress indicators where available.
2. Content Explorer: search/filter ID, band, lesson type; view current published content, public source and private staff-only research/correction notes. Permission-protected statuses ONLY here.
3. Editorial workbench: adjust sentence, translation, distractor, feedback, alternative accepted response, help hint. Validation preview using real learner component. Keep draft revision and immutable published baseline.
4. Report queue: users report wrong key/translation/grammar/ambiguous answer/AI feedback; attach release/unit/item/model context automatically, avoid gratuitous personal text.
5. Publish manager: deterministic content patch -> editorial checks -> versioned JSON export -> reviewed deploy/commit flow -> verify published hash + deployment -> announce success. Use only authorized GitHub/cloud service integration. If no publishing credential, allow manual exported artifact or documented reviewed main-commit process, state "awaiting deploy" truthfully.
6. Emergency suspend: authorized admin can immediately disable clearly invalid/harmful *item*, with minimal public blocklist, no leak of reason, cache TTL test, reinstate after correction.
7. Rollback: retain previous release manifest and patch audit; safely revert changed item while preserving student progress. Admin sees release IDs and actor/time.
8. Support: users/status/search by minimal profile only, no unnecessary display of full private AI conversations to all admin roles; data deletion/export request workflow.
9. Ops: AI provider successful/failed calls by class, fair-use counter, stale/unconfigured settings, DB capacity monitoring threshold, incident logs.

## Critical privacy rule
Ordinary users cannot see any item-level `Research-Based`, `Expert Verified`, `Under Review` or similar content review status, including tooltips, JSON, API calls, HTML hidden attributes or GitHub-public package metadata. Reporters can see their **report's own status** if product enables that; this is not content verification status. Admin review queue is in protected Supabase DB and not shipped in repo content bundle.

## Bootstrap & mutation safety
- Owner must manually add one exact admin user UUID via a protected SQL/migration/CLI operational step after Supabase configured; do not create hidden demo admin in production.
- Every admin action requires authenticated session, authorized membership role, CSRF/session controls as applicable, input validation, audit, bounded rate, sensible confirmation for destructive changes.
- Display Draft/Queued/Deployed distinctly. Never call a draft "published".
- Reviewers/editors may prepare content but cannot grant owner/admin access by direct API request. Test forged role payloads and direct REST calls.
- Versioned source data may be public, but no sensitive editorial details belong inside it; redact intentionally and test build outputs.
