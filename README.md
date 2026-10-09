# EngJatra — complete Codex implementation handoff

**EngJatra** — Learn English. Enjoy the Journey. | সহজ ধাপে, নিজের গতিতে ইংরেজি শিখুন।

This package is a **fresh-start project brief and original teaching data**, not an existing application. Previous prototypes, HTML demos, frontend/backend app code were rejected and are **NOT** included. The owner intends to connect a new GitHub repository to Codex and authorize full implementation; the full Codex command is in `CODEX_MASTER_PROMPT.md`.

## Upload to GitHub / Codex (important)
1. Create/connect a **new, preferably private** GitHub repository named `engjatra` (or your preferred repo name). No earlier code imports.
2. **Preferred:** download/extract ZIP and upload the extracted *contents* into the repository root (so `AGENTS.md` is root). **One-file alternative:** upload the ZIP itself to your new repo and use the activation prompt below: Codex must unpack and move the enclosed folder contents to repo root BEFORE using the specifications. GitHub does NOT automatically extract an uploaded ZIP.
3. Open Codex on this repository. Paste the full text of `CODEX_MASTER_PROMPT.md` as the first task. No need to retype product details.
4. Codex should implement all locally executable work, run iterative QA, report verified/blocked items, and create `docs/CREDENTIALS_AND_DEPLOYMENT.md` with exact operator actions. Give credentials **later** via Supabase/Cloudflare secret configuration, **never in code, prompt or chat logs**.
5. Enable deploy only when tests/owner check pass, and verify `engjatra.pages.dev` availability at setup. Do not assume that URL was reserved.

## What's included
- `AGENTS.md` persistent rules for every future Codex or human contributor.
- `CODEX_MASTER_PROMPT.md` all-in-one execution instruction to build the complete product.
- `docs/` current product, brand, UX, architecture, learning engine, AI, admin, security, QA and release runbook.
- `brand/` scalable starter logo SVG files. These vector assets are brand concepts, not deployed app code.
- `content/source/` research-derived authored data with per-item private review status fields removed.
- `content/units-public/` 96 segmented learner-safe unit JSON files plus manifest. This is a starting content library, not expert-reviewed CEFR certification.
- `content/reference/` course index, structural baseline, and official educational references.

## IMPORTANT limitations
- 96 instructional units (16 per level across Pre-A1/A1/A2/B1/B2/C1); 932 word/sense entries; 132 grammar cards; 96 scripted conversations; 480 offline activities; 12 supplementary longer reading texts. This is a substantial **draft instructional starting point**, not a comprehensive CEFR C1 qualification.
- Prior structural QA reported zero blocking structural issues, **not** zero semantic/translation errors. Independent qualified teacher verification is **not** complete. No public expert verification badges or internal status exposure.
- No Supabase project, Cloudflare account, credentials, hosted URLs, provider limits or public deployment have been configured or verified by this package.
- No app is included or claimed complete. Codex must implement it from scratch.

## Primary source of truth
`AGENTS.md` and `docs/*`. Research data is input, not source of truth for policy/security/UX. Archive of older contradictory specs should not be uploaded. If files conflict, log and resolve in `docs/DECISIONS.md`.
