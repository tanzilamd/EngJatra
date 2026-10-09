# Troubleshooting

| Symptom | Diagnosis / action |
| --- | --- |
| Ports 5173/5174/8787 occupied | Stop only the processes you started or change the coordinated Vite/Worker/test ports. Vite uses strict ports intentionally. |
| Local admin returns forbidden | Enter the explicitly labelled local admin demo on the admin origin. Production headers cannot create a role; use owner-provisioned DB membership. |
| No cloud login in a production build | Configure both public Supabase fields; blank configuration deliberately fails closed. Run `dev:live` to test real auth, not `dev`. |
| Empty provider health | No observed results are recorded. Check actual account/log dashboards; absence is not readiness. |
| AI unavailable | Continue the scripted dialogue in place. Verify server credentials, exact eligible model and free switches; do not turn on billing or invent limits. |
| Unknown 429 | Keep it unknown until the provider's current documented evidence identifies a subtype. Do not display invented reset timers. |
| Save pending | Keep the tab open; reconnect or retry. The queue is account-scoped and persisted when browser storage works. Confirmed state is separate. |
| Storage full/disabled | A specific error states the queue is not durable. Reconnect and retry before closing; server acknowledgments remain authoritative. |
| Revision conflict | Personal completions/words/attempts merge and retry; editorial drafts require reopening and manually reconciling changes. |
| New release not visible | New lessons at step zero use the current manifest; partially completed lessons remain pinned to their prior release. Retain old immutable assets. |
| Unit unavailable | Check static file/version, suspension overlay and network. Never bypass the blocklist just to show a lesson. Already opened authored content survives an interrupted connection. |
| Draft saved but site unchanged | This is expected. Export, audit, deploy the artifact with owner authorization, verify hashes, then record deployment. |
| Wrangler cannot write home config | Use the repository Node wrapper; it places config/logs in ignored `.wrangler` without changing HOME. |
| Missing Chromium | Set `CHROMIUM_PATH` or install Playwright's managed Chromium and set that variable to an empty string. CI handles browser installation. |
| Source audit passes but language seems wrong | Structural validation is not semantic/teacher review. File a versioned report and use private correction workflow. |

Detailed local browser traces/screenshots live in ignored `test-results` and `playwright-report`. Public production source maps are disabled. Do not log credentials, provider response dumps or full learner messages while diagnosing live incidents.
