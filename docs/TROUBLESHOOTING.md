# Troubleshooting

| Symptom                                      | Diagnosis / action                                                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ports 5173/5174/8787 occupied                | Stop only the processes you started or change the coordinated Vite/Worker/test ports. Vite uses strict ports intentionally.                                                      |
| Local admin returns forbidden                | Enter the explicitly labelled local admin demo on the admin origin. Production headers cannot create a role; use owner-provisioned DB membership.                                |
| No cloud login in a production build         | Configure both public Supabase fields; blank configuration deliberately fails closed. Run `dev:live` to test real auth, not `dev`.                                               |
| Empty provider health                        | No observed results are recorded. Check actual account/log dashboards; absence is not readiness.                                                                                 |
| AI unavailable                               | Continue the scripted dialogue in place. Verify server credentials, exact eligible model and free switches; do not turn on billing or invent limits.                             |
| Unknown 429                                  | Keep it unknown until the provider's current documented evidence identifies a subtype. Do not display invented reset timers.                                                     |
| Save pending                                 | Keep the tab open; reconnect or retry. The queue is account-scoped and persisted when browser storage works. Confirmed state is separate.                                        |
| Storage full/disabled                        | A specific error states the queue is not durable. Reconnect and retry before closing; server acknowledgments remain authoritative.                                               |
| Revision conflict                            | Personal completions/words/attempts merge and retry; editorial drafts require reopening and manually reconciling changes.                                                        |
| New release not visible                      | New lessons at step zero use the current manifest; partially completed lessons remain pinned to their prior release. Retain old immutable assets.                                |
| Unit unavailable                             | Check static file/version, suspension overlay and network. Never bypass the blocklist just to show a lesson. Already opened authored content survives an interrupted connection. |
| Draft saved but site unchanged               | This is expected. Export, audit, deploy the artifact with owner authorization, verify hashes, then record deployment.                                                            |
| Wrangler cannot write home config            | Use the repository Node wrapper; it places config/logs in ignored `.wrangler` without changing HOME.                                                                             |
| Missing Chromium                             | Set `CHROMIUM_PATH` or install Playwright's managed Chromium and set that variable to an empty string. CI handles browser installation.                                          |
| Source audit passes but language seems wrong | Structural validation is not semantic/teacher review. File a versioned report and use private correction workflow.                                                               |

Detailed local browser traces/screenshots live in ignored `test-results` and `playwright-report`. Public production source maps are disabled. Do not log credentials, provider response dumps or full learner messages while diagnosing live incidents.

Current deployment uses three Workers, not Pages. Read `docs/DEPLOYMENT_SIMPLE_BN.md` and `docs/ENVIRONMENT_VARIABLES.md` first.

| Deployment error                            | Permanent diagnosis / action                                                                                                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assets missing directory                    | Use root student or explicit admin config; both have actual Vite dist directories. Do not generate framework config.                                                                   |
| Compatibility date missing                  | Three checked-in targets use the same date; run `npm run deploy:check -- --offline` after building.                                                                                    |
| Expected engjatra but engjatra-api uploaded | Root config is student engjatra. API deploy always uses its own validated config; disable generic native trigger.                                                                      |
| Frontend built but deployment failed        | Build is not deploy. Check account token/target/runtime input and the distinct Actions deployment/verification logs.                                                                   |
| Blank vars erase production config          | API has no blank defaults and keep_vars true; managed script supplies validated config and additive version secrets. Do not paste secrets in CLI args.                                 |
| Missing deployment inputs                   | Read the redacted EngJatra deployment blocked annotation on the failed GitHub check, then set the exact Actions Variables/Secrets once; Codex secrets are not forwarded automatically. |
| Native and Actions deploy fight             | Disable Workers Builds automatic deploy for the same three names; keep the single Actions trigger.                                                                                     |
| Stale QA proof                              | Source or commit changed; deploy reruns QA. Do not fake the proof or skip security checks.                                                                                             |
| Published content baseline missing          | Restore the last approved student artifact. Never drop old versions or reuse a changed immutable version to make deployment pass.                                                      |
| Strict upload / hash verification failed    | Investigate conflicting edits or partial deploy; inspect versions, rollback affected targets and fix source on main. No force-push.                                                    |
| Google/SMTP fields not found in env         | They belong in Supabase Auth provider/email dashboards, not Worker/Vite. See inventory.                                                                                                |

## Accepted upload but stale HTML; Worker-only AI failure

A 200 response with the previous HTML is a failed artifact check, not publication success. Inspect all active versions and rebuild the exact accepted source; use bounded same-URL revalidation rather than another upload. The verifier now checks up to five reads over 30 seconds of backoff and still fails persistent mismatches. Current 3c20703 HTML later matched all files without publishing again.

If Node Gemma preflight passes but the Worker reports AI_NETWORK_FAILURE, test the actual Worker-native Request options. workerd rejects redirect:error before sending; use manual mode and explicitly reject 3xx so credentials cannot follow redirects. The regression test bundles the actual provider adapter into workerd, separately from real provider/live-browser proof. Never print transport exceptions containing untrusted/private data; controlled QA diagnoses known public error codes only.
