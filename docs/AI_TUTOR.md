# AI Tutor & Free-provider Failure Architecture

## Non-negotiables

- Text-only written guided English conversation with Bengali support. One question at a time; speak at current teaching band. The assistant should reward effort but accurately correct material mistakes, explain in short Bangla, accept alternative valid phrasings, refuse to falsely certify CEFR proficiency.
- Primary eligible **Google AI Studio Gemma** model (historically considered Gemma 4 26B A4B) and independently hosted **Llama** provider/model. Actual IDs, API support, quotas, commercial eligibility, and free access must be checked **at integration time**; never use a made-up model ID or assume quota totals add across models.
- Free-only: no paid upgrades, no fallback to a billable provider. Strict per-user and site-wide fair-use; no unbounded retries; prompt/token size ceilings, global fail-safe. Never claim unlimited free AI.

## Request sequence

1. Receive authenticated request at Cloudflare protected server endpoint. Validate user session/role, origin policy as applicable, unit ID/release, size, text limits, idempotency and per-user budget.
2. Load _relevant current unit lesson facts_ and last few needed conversation turns. Do not send all user history. Minimize personal information; tell user cloud providers process messages as required by policy.
3. Choose configured primary provider; if eligible and healthy, call with request-level timeout/size cap; parse, validate and sanitize structured result (schema in `packages/contracts`).
4. On provable retryable failure perform bounded backoff with jitter only where provider guidance permits. Circuit-break observed temporary failures. On eligible failover, use independently configured free fallback. Do not retry on invalid key or permanent violation.
5. If both unusable, respond with specific classification if known and **offline alternative activity ID**; preserve checkpoint.
6. Persist short relevant conversation messages only if user's privacy/retention policy allows; no private prompt dumps in analytics.

## Structured response proposal

```
{
  "assistant_reply_en": "...",
  "short_explanation_bn": "...",
  "feedback_type": "none | suggestion | clear_error",
  "suggested_revision_en": null,
  "next_question_en": "...",
  "learning_tags": ["..."],
  "source_unit_id": "A1-01"
}
```

Use schema validation, bounded strings, tags allowlist, no unsanitized HTML or generated executable code. Model statements about a user's ability are suggestions not authoritative grading. If provider cannot reliably return schema, adapt with validated extraction and safe fallback, never render broken JSON raw to student.

## Error taxonomy (expose user-safe Bengali)

- `USER_SESSION_EXPIRED`: `আবার লগইন করলে তোমার শেখা চালিয়ে যেতে পারবে।`
- `AI_REQUESTS_PER_MINUTE` (only proven RPM): `এই মিনিটে AI অনুশীলনের সীমা পূর্ণ হয়েছে। নিচের অনুশীলন চালিয়ে যাও।`
- `AI_TOKENS_PER_MINUTE` (only proven TPM): `এই মুহূর্তে AI লেখার সীমা পূর্ণ হয়েছে। অন্য অনুশীলন চালু আছে।`
- `AI_DAILY_QUOTA` (only proven provider daily): `আজ AI অনুশীলনের সীমা শেষ। Reading ও Grammar অনুশীলন করতে পারবে।`
- `AI_USER_FAIR_USE`: `তোমার আজকের AI অনুশীলনের বরাদ্দ শেষ। অন্য মিশনগুলো চালু আছে।`
- `AI_PROVIDER_OVERLOAD`: `AI সার্ভার ব্যস্ত। এই মিশনের অন্য অংশে এগোতে পারো।`
- `AI_TIMEOUT`: `AI উত্তর দিতে দেরি করছে। এখন অন্য অনুশীলন করতে পারো।`
- `AI_NETWORK_FAILURE`: `সংযোগে সমস্যা হচ্ছে। সংরক্ষিত অনুশীলন চালিয়ে যেতে পারো।`
- `AI_UNCLASSIFIED_429`: `AI অনুরোধে সাময়িক সীমা এসেছে। কারণ নিশ্চিত হওয়া যায়নি।`
- `AI_PROVIDER_UNCONFIGURED`: development/admin only `AI সংযোগ এখনো সেটআপ করা হয়নি।`
- `AI_INVALID_RESPONSE`: `AI উত্তরটি ঠিকভাবে পাওয়া যায়নি। অন্য অনুশীলন চালিয়ে যাও।`
- `SAVING_FAILED`: `অগ্রগতি এখনো সংরক্ষিত হয়নি। সংযোগ ফিরে এলে আবার চেষ্টা করব।`
- `STORAGE_CAPACITY`: `কিছু ইতিহাস সংরক্ষণে সমস্যা হচ্ছে। শেখার অগ্রগতি নিরাপদ রাখতে আবার চেষ্টা করো।`
  For any 429, classify RPM/TPM/RPD only from trusted provider data/counters. Do not infer type from HTTP 429 alone. Reset time shown only when evidenced; no fake timers or fake “try in exactly 60 seconds” advice.

## Provider tests (mock first; real later)

- Healthy primary; primary timeout then secondary; primary genuine RPM; TPM/daily subtype when provider states; ambiguous 429; both exhausted; invalid JSON; race on concurrent requests; invalid credential; forbidden/unconfigured providers.
- Verify no key in response/log/source map. Ensure free-only toggle and token cap hold. Stress per-user throttling and independent backoff. Paid path disabled.

## Operational uncertainty

Google's official pricing page currently lists Gemma 4 Free Tier, but usable API model IDs/rate limits still depend on account/project. Provider privacy/data-use terms may differ. Do not choose an account-specific configuration until owner supplies keys, and do not silently turn on a paid plan.
Reference: https://ai.google.dev/gemini-api/docs/pricing

## Launch provider review — 2026-10-10

Official pricing inspected at https://ai.google.dev/gemini-api/docs/pricing lists **Gemma 4 input/output free of charge; paid tier not available**. This does not prove a configured account's model access, quota or application eligibility. The existing `GEMMA_API_KEY` is already in Actions; do not request it again. `npm run ai:check` performs a fixed HTTPS model metadata GET in the protected main deployment job and records safe evidence, with no inference or learner messages. `GEMMA_FREE_CONFIRMED=false` remains intentional until all gates are satisfied. Optional unconfigured Llama does not block the core application.

Google's current https://ai.google.dev/gemini-api/terms requires age 18+ and prohibits API clients directed toward or likely accessed by under-18s. It also requires Paid Services for clients made available in the EEA, Switzerland or UK; this application's zero-cost constraint does not permit that substitution. Unpaid messages/outputs may improve Google's products and human reviewers may process them. An unrestricted child/teen learning service cannot simply activate this integration. Establish an eligible audience/region and account/privacy approval before generation or activation; never infer that these are approved because a key/model metadata request works. Current learner disclosures explain free processing; authored activities remain available.

Malformed provider JSON/envelopes classify `AI_INVALID_RESPONSE`, not network failure. Disabled production providers return the authored fallback before consuming daily/global inference quota. Existing bounded output/context, timeout, safe unknown-429 classification and eligible fallback contracts remain enforced. Real timeout/quota/malformed scenarios are simulated locally; do not spend live quota or induce production exhaustion to label those tests real.

## Confirmed production decision

The owner confirmed mixed ages, including under-18s, and instructed that Google AI Studio remains the Gemma provider. No migration or alternate AI service is authorized. Run [38038409096](https://github.com/tanzilamd/EngJatra/actions/runs/38038409096) successfully authenticated the existing key and `gemma-4-26b-a4b-it` metadata, which supports generateContent. This did **not** invoke inference. Production remains disabled with the free-confirmed flag false because current terms conflict with the audience. Preserve the ready integration and authored alternatives until a compliant activation is actually established; there is no owner checkbox or secret replacement that removes this restriction. Do not let the AI gate stop independent development.
