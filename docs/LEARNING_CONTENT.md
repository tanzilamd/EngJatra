# Learning Engine & Content Quality — EngJatra v1

## Available material and honest scope

From the authored source pack of 2026-10-09: 96 units, evenly distributed over P0, A1, A2, B1, B2, C1 (16 each); 932 word/sense records; 132 grammar cards; 96 scripted conversations; 480 non-AI activities (384 autograded + 96 free-writing authored tasks); 12 extra reading texts; 6 formative checkpoints. The unit index is in `content/reference/CURRICULUM_INDEX.md`.

**These are draft teaching-band placements.** Independent expert review was not performed. Old structural QA found 0 structural issues, not 0 grammar/semantic faults. Warnings include many short readings and insufficient C1 depth for certification. Teach C1-related content but never promise the course proves C1 skills; all-four-skills CEFR mastery cannot be confirmed with no speaking/listening assessment.

## Content contracts and lesson delivery

- Stable `unit_id`, `activity_id`, `sense_id`, band (P0 mapped to public `Pre-A1`), release version, `skill_tags`, learning goal, Bengali explanation, authored examples.
- Chunk data by current unit (already present in `content/units-public`), lazy-fetch with an app manifest; avoid loading 96 units plus whole vocabulary bank on first render.
- Source data should be normalized/validated. Authoring data may contain some repetitions/incomplete lexical parts of speech. Treat `learning_level_suggested` as suggested teaching placement, NOT externally verified CEFR word sense.
- Add editorial validation for meaningful translation, coherent English examples, multiple correct answers and unique distractors; structural audit alone is not enough. For C1, check argument nuance, discourse connectors, hedging, inference and appropriate register with relevant examples.
- Keep references in source docs; don't copy long copyrighted CEFR, British Council, Oxford/Cambridge text without licensing. Create original teaching material.

## One consistent learning loop

1. Show Bengali goal + short concept.
2. Example + optional word/translation hints.
3. 2–5 authored active tasks, 1 question per view, immediate explanatory feedback.
4. A scripted mini-conversation/reading mission; optional AI written expansion when service available.
5. Retrieval/review of mistakes and meaningful checkpoint save.
6. Offer one clear next action. Never make the whole session depend on AI response.

## Scoring and grading

- Objective activity: authored correct indexes/accepted alternatives + language-safe normalization (trim/spacing/case where appropriate), with explanations of why. Don't conflate case changes that matter (proper nouns/punctuation in writing) with wrong answers.
- Sentence builder: allow multiple equivalent orders when grammatical and consistent with task objective; deterministic author-maintained acceptable sequences or rule-based grammar structures, not AI whim.
- Free writing: show rubric, example, and **self-assessed** reflection offline. If AI available provide a probabilistic suggestion, not binary “incorrect” for all non-identical answers. Always offer user edit/retry.
- Completion threshold based on viewed/practiced required tasks with retry, formative questions as diagnostic; no paywall; do not assign global CEFR proficiency based only on in-app points.
- Vocabulary states: New -> Learning -> Practising -> Demonstrated Recall; spaced-review time configurable, old states migrate on content revisions, false confidence prevented by simple tap-only advancement.
- Mistake review indexes actual `skill_tag` and authored examples, not infinite repetition of same memorized question; avoid punitive red screens and streak pressure.

## Reading/writing band progression

- Pre-A1/A1: words, short signs, forms, simple messages, basic sentences with sentence tiles and Bangla scaffolding.
- A2: short narratives, plans, simple past/future, everyday functional exchanges.
- B1: connected stories, explanations, opinions, personal experiences, paragraph writing.
- B2: balanced viewpoints, longer original passages, evidence, reasoning, registers, organized writing.
- C1-oriented: nuanced implication, complex arguments, hedging, discourse, synthesis and critique, extended writing prompts and self-review; **do not claim a 16-unit track alone equals true C1 proficiency**.
- Listening/speaking v1: external official links and self-practice scripts; track completion of resource visit/self-report, label it as self-practice, never recorded performance grade.

## Content QA & publication

- QA each item against sentence correctness, naturalness, Bengali meaning, context, answer key, other acceptable answers, level placement, cultural clarity, license and references.
- Admin editorial review records remain IN DATABASE ONLY and authorized admin UI. Site visitors must NEVER see `verified`, `research`, `teacher checked`, `under review`, internal source scores etc. Do not include hidden fields in static assets or API JSON.
- Authoring may be published with internal research-based checks; do not falsely imply independent expert sign-off. Reported content stays visible until credible serious error is verified, then suspend/correct if needed.
- Maintain versioned change list and invariant that saved progress remains valid on edited wording.
- Automated script must reject duplicate IDs, broken unit/activity cross-references, duplicate multiple-choice options, bad correct_index, empty translations and illicit private status fields. For authored examples, layered bilingual editorial QA is still required.

## External official research pointers

- Council of Europe CEFR descriptors: https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors
- Companion Volume: https://book.coe.int/en/education-and-modern-languages/8150-common-european-framework-of-reference-for-languages-learning-teaching-assessment-companion-volume.html
- British Council grammar A1/A2, B1/B2, C1: https://learnenglish.britishcouncil.org/free-resources/grammar/c1
- British Council reading: https://learnenglish.britishcouncil.org/free-resources/reading
- British Council writing: https://learnenglish.britishcouncil.org/free-resources/writing
- Oxford 3000/5000 methodology: https://www.oxfordlearnersdictionaries.com/about/wordlists/oxford3000-5000

## Additional integration note

36 supplemental grammar cards in `content/source/grammar.json` have a **level**, but no `unit_id`. They are intentionally band-scoped. Present them in a level Grammar Library and/or editorially map them to relevant units. Do not silently drop them or invent canonical unit mappings without checking their actual rule/topic.

## Immutable teaching supplements

`content/releases/3.0.1.json` adds original Bengali translations for the 36 supplemental grammar examples and seven short English examples for exact beginner vocabulary senses. Two narrow caveat corrections fix the possessive determiner spelling (`their`) and a Bengali typo; rules, English examples, answer keys and IDs stay stable. The short-answer translation explicitly retains its dependence on the preceding question rather than inventing a missing predicate. These are substantive authoring corrections, not independent teacher approval.

`content:export` keeps the original 3.0.0 release byte-for-byte, applies strict exact-text/sense anchored supplements to a new directory and advances the manifest. Unit bytes/hashes remain identical; existing in-progress lessons keep their version. Collections load the latest manifest without modifying saved lesson state. Future supplements append a new increasing release with a matching base; editing published files fails the existing deployment baseline guard. Unit edits still use protected draft/export and `release:export` workflows. Public release files contain teaching text only, never confidential editorial notes or verification states.
