# EngJatra Brand, UI/UX & Design System — final v1

## Identity
**Name:** EngJatra (exact capitalization). **Tagline:** `Learn English. Enjoy the Journey.` **Bengali supporting line:** `ইংরেজি শেখার আনন্দময় যাত্রা।` **Positioning:** friendly and credible educational journey, not childish or a generic AI chat bot. The logo is a flat speech/path icon with clean EngJatra wordmark; see `/brand/` files, preserve legibility at 16–32px icon size. Starter SVG assets are ready but may be refined without breaking this concept.

## Color tokens (canonical)
| token | HEX | use |
|---|---|---|
| primary | `#2563EB` | primary CTA, selected navigation, important links |
| primaryHover | `#1D4ED8` | primary hover/focus |
| textStrong | `#1E293B` | headings, wordmark, strong UI text |
| textMuted | `#64748B` | support text and captions, ensure contrast |
| amber | `#F59E0B` | tiny motivating accent, journey step, noncritical callouts |
| success | `#14B8A6` | success/completion indicators (pair with text) |
| bg | `#F8FAFC` | page background |
| surface | `#FFFFFF` | cards, input surfaces |
| border | `#E2E8F0` | subtle separators |
| soft | `#EEF2FF` | selected/beginner hint surfaces |
| danger | `#DC2626` | genuine errors |
| warning | `#D97706` | warnings |

Provide adequate contrast; token values may be deepened for accessible text (e.g. don't put white small text on raw amber or teal) without changing brand essence. Never use color alone to signal correct/incorrect.

## Typography
- **Hind Siliguri** for Bengali UI/teaching copy; **Inter** for Latin UI and English examples; use bundled font loading or Google Fonts with resilient system fallback, no unnecessary huge font files.
- Mobile minimum main body approximately 16px, Bangla line height ~1.65–1.8, English examples ~1.5. Scale: caption 13/14, body 16, small title 18/20, section title 24, hero 30–36 (responsive). Do not make Hindi-script misrendering or tiny Bengali text.
- Strong language differentiation: English learner sentences on distinct light card/typographic style; Bengali translation behind a tap on later levels, initially visible for beginners. Respect text zoom up to 200%, narrow 320px widths and browser dark mode when supported.

## Shape/spacing/elevation
- Spacing 4,8,12,16,20,24,32,40,48 px multiples as appropriate; plenty of breathing space, no needless giant gaps.
- Inputs/buttons radius 12px; cards radius 16px; pills 999px. Buttons minimum ~44px tap height. Focus-visible outline, disabled and loading states, keyboard/tab order.
- Flat subtle shadows, simple outline icons (consistent Lucide-like), 1–2 simple delight animations maximum per interaction; respect `prefers-reduced-motion`.
- React reusable components: AppShell, TopBar, BottomNav, Button, Link, Card, ProgressBar, LessonStep, SentenceTile, ChoiceOption, HintPopover, ReportDialog, Toast, OfflineFallback, EmptyState, ErrorBoundary, AdminTable, LoadingSkeleton.

## Screen-by-screen UX contract
1. **Welcome**: immediate value proposition in Bengali; single prominent get-started action, sign-in.
2. **Auth**: Google/email, clear consent/privacy, password reset/magic link as supported; no extra fields.
3. **First choice**: "একদম নতুন" / "কিছুটা ইংরেজি পারি"; optional placement with skip.
4. **First tour**: <=3 anchored, skippable steps (continue, path, help); persisted, replayable.
5. **Home**: single obvious Continue CTA above fold, today's achievable mini goal, progress summary and due review, no social feed.
6. **Learn Path**: six bands, current unit highlighted, completed replay, next preview. One continuous flow, not four top navigation tabs for four skills.
7. **Unit Detail**: Bangla learning goal, short example, one question/card at a time, tap hint, submit/check answer, explain, Next.
8. **Conversation Quest**: NPC -> 2+ authored replies (honest outcomes), optional AI chat in the same mission; stable transitions.
9. **Vocabulary**: word + sense + English contextual example + Bangla gloss + recall, personal save/review.
10. **Reading**: original English passage, in-context word help, evidence-linked questions, easy text size.
11. **Writing**: guided short sentence -> paragraph/arguments at higher levels; accept multiple valid forms; rubrics and feedback caveats.
12. **Progress**: true completion/mastery, revision due, latest checkpoints, clear distinction between practice and certification.
13. **Settings/Help**: tour replay, language/hint preference, readability, progress export/delete, error reporting, privacy.
14. **Admin**: separate data-dense but clean site, side navigation on desktop, compact mobile menu, audited actions and verification only for admin.

## UX content and errors
Bengali-first: `শেখা চালিয়ে যাও`, `বাংলায় বুঝিয়ে দাও`, `উত্তর দেখাও`, `আবার চেষ্টা করি`, `পরে দেখব`, `অগ্রগতি সংরক্ষণ হচ্ছে…`, `সংরক্ষিত হয়েছে`, `ইন্টারনেট ফিরে এলে সংরক্ষণ হবে` (only if queued). No fake congratulation for incorrect answer; acknowledge effort and explain actual correction. Student should not see `Research-Based` / `Verified` / `Under Review` badges or internal verification in tooltips or fetched JSON.

## Hosting and responsive polish
Mobile-first responsive, bottom nav on small screens, wide max-width learning area on desktop; low-bandwidth unit fetch, lazy loading and good perceived speed; no hero videos, no autoplay or heavy animations. Accessible light theme first; dark mode can be built if not disruptive, but not at expense of core functionality.

## Admin design style
Same brand typography/color but sober, accessible tables and filters, confirmation on destructive actions, distinct affected content ID + version, clear unsaved/draft vs deployed/published status. Never imply review status is student-facing.
