# EngJatra Product Requirements — v1.0 (authoritative)

## Vision
A truly welcoming, fun, mobile-first **Bangla-language** path to learn English from absolute zero. The app is one coherent, interactive journey, not a complicated menu and not just an AI chat box. AI is an enhanced practice coach; **structured authored learning survives complete AI outage**. Meaningful persistence between sessions/devices is essential.

## Users and learning model
- Audience: Bengali speakers including absolute beginners, slower learners and learners with limited data budgets; avoid collecting exact age unless operationally required. Respect privacy for minors.
- Six teaching bands: **Pre-A1**, A1, A2, B1, B2, **C1-oriented**. Track band is NOT proof of assessed/certified CEFR proficiency.
- Reading/writing in-app. Listening/speaking have linked official resources, practice scripts and self-study tips only in v1; no mic or speech analysis.
- Bengali instructional guidance is always available. It decreases contextually as written ability increases but never vanishes with no opt-back.

## Student experience
**Main navigation (and only primary destinations):** হোম, শেখা, অগ্রগতি. Profile/settings/help/report via secondary accessible controls. Prominent `শেখা চালিয়ে যাও` button.

**User journey**
1. Welcome and Google/email sign-in. Offer guest **local demo only in development**, not impersonated production account.
2. One beginner/self-assessment choice, optional brief placement exercise for returning learners.
3. <=3-step skippable and replayable tour (~30-45s). Contextual hints once per feature/tour version.
4. Begin Pre-A1 Unit 01 or recommended unit. Short goal (বাংলা) -> micro-lesson -> worked example -> 2–5 exercises -> choice-based conversation/reading -> optional AI written exchange -> simple mistake feedback -> save confirmed checkpoint -> next action.
5. All six tracks browseable. No gratuitous paywalls or fake locked buttons. Unlocking/advancement explained and tied to meaningful practice, not streak points alone.
6. Return on another device and resume last server-acknowledged saved step. Unsent changes labeled; pending sync queue safe on interruptions. Show user their personal mistakes, vocabulary spaced review, progress summary and optional (bounded) past AI chats.
7. At any item, report an incorrect explanation/translation/key or problematic AI answer. Capture version automatically; student-facing report acknowledgment only (not hidden editorial status).

## Activities
- Vocabulary in context: display word sense, Bangla gloss, English example, recall practice; distinguish user-marked known from demonstrated mastery.
- Grammar Detective: identify authored error and see concise explanation.
- Sentence Builder: flexible valid sequences where pedagogically appropriate; avoid single naive string check.
- Scripted Conversation Quest: correct/appropriate multiple paths, short feedback.
- Reading Evidence Hunt: support answers with actual authored passage evidence.
- Writing Lab: writing prompts and self-review rubric, AI feedback when available, never exact-match grading for free text.
- Mistake Revenge: revisit skills with different authored examples rather than endless identical multiple choice.
- Spaced retrieval: transparent next review timing and easy 'practice again'.
- Level checkpoint: motivational **formative practice** only. Listening/speaking not graded. C1 track completion ≠ C1 certificate.

## AI tutor
- Text only; short supportive English at learner's target level, brief Bangla correction where necessary, one question at a time, adaptive hints, alternate valid answers accepted.
- Verified configured free Gemma model primary; separate free Llama provider fallback. Unknown/free-changing quota -> fail safe.
- All errors handled specifically when evidence supports it: RPM/TPM/daily quota/per-user fair use/timeout/network/expired session/misconfiguration. Never fabricate reset times or imply unlimited free API.
- On exhaustion, transition in-place to scripted/practice content and keep last checkpoint.

## Admin product
- Privileged independent interface, separate protected route/site; must have server and DB authorization.
- Review flags ONLY in protected admin DB: research draft/reviewed/under review/reported/suspended. Learner UI/static JSON/API never reveals per-item verification flags. Research-based authored content can be learner-visible after internal editorial checks even without expert review; human expert label never fabricated.
- Queue reports, trace unit/version, revise content and publish explicit versioned updates, rollback, instant suspend critically wrong activities, moderation/audit trail. Monitor AI quota/free tier/storage/egress where observable.

## Business/operational constraints
Free-user app on Cloudflare Pages + serverless Functions/Worker and Supabase Free. Static JSON/CDN for authored content, Supabase for auth/progress/history/admin. Choose transparent limits rather than unexpected paid fallbacks or data loss. Candidate `engjatra.pages.dev` (availability must be checked). App must be maintainable for future Codex/human developers. No ads, public student social network, file uploads, browser-run LLM, voice features, PDF analysis or paid tier in v1.

## Outcomes that can be verified
- Beginner completes first Bangla-guided English sentence with no complex setup.
- 96 provided units navigable; all deterministic exercises have meaningful learner feedback.
- Returning user resumes checkpoint across devices after Supabase configured and verified.
- Session/rate errors fallback to non-AI content, no broken empty screen.
- User cannot fetch another user; non-admin cannot access admin; public build has no internal review labels.
- Whole stack can run in clear local demo mode without production secrets; deploy checklist identifies the external-only steps.
