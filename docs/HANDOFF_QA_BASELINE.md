# Handoff package QA baseline — 2026-10-09

Historical record of the original teaching-data package before implementation. Current application checks and external gates are in `docs/STATUS.md`; this baseline does not supersede them.

## Checks completed locally (handoff data/artifacts only)
- All 96 unit records present, 16 in each of Pre-A1/P0, A1, A2, B1, B2, C1.
- Authored source libraries present: 932 vocab/sense entries, 132 grammar cards, 96 conversations, 480 offline exercises, 12 additional readings.
- Public unit manifest lists each of the 96 unit IDs, 96 segmented JSON files exist with matching IDs.
- Cross-unit IDs for unit-linked conversations/grammar/offline activities and vocabulary are valid.
- Some grammar cards (36) are **supplemental per-level** and intentionally have no `unit_id`; Codex must make them available in the level library and/or editorially map them to lessons.
- Private publication/research/expert verification fields were removed from shipped data; automated audit checks for forbidden metadata in all public unit JSON and authoring data. Exception: generic learner self-review instructions such as `review_steps_bn` are educational content, not internal verification flags.
- Logo SVG assets parsed successfully as XML.

## What has NOT been verified
- No independent human/teacher review of all grammar, Bangla translations or answers.
- Structural checks cannot guarantee accurate language pedagogy, CEFR alignment, unique meanings, fully adequate B2/C1 teaching or valid all-possible open-text answers.
- At the original package audit, no application existed, so that audit did not test browser, auth, migrations, RLS, AI APIs, admin security or Cloudflare deployment. Later local application evidence is recorded separately in `docs/STATUS.md`.
- Actual Cloudflare Pages subdomain availability and usage limits are not checked against owner's account.

## How to rerun baseline
Python 3: `python scripts/check_handoff.py` (standard library only).

Continue running the comprehensive checks in `docs/QA_ACCEPTANCE.md`, update `docs/STATUS.md`, and report live integration gates truthfully.
