# EngJatra design system

## Identity
**Name:** EngJatra (exact capitalization). **Tagline:** `Learn English. Enjoy the Journey.` **Bengali supporting line:** `ইংরেজি শেখার আনন্দময় যাত্রা।` **Positioning:** friendly and credible educational journey, not childish or a generic AI chat bot. The logo is a flat speech/path icon with clean EngJatra wordmark; see `/brand/` files, preserve legibility at 16–32px icon size. Starter SVG assets are ready but may be refined without breaking this concept.

## Semantic color system
`packages/ui/styles.css` is the implemented token source. Preserve recognizable brand blue `#2563EB`; use semantic tokens for page, surface, raised/soft surfaces, text, muted text, borders, accent, success and error. Light uses a cool quiet background, white surfaces and navy text. Dark uses navy surfaces, pale text and accessible blue buttons. Never scatter white backgrounds or literal text colors through feature components. Text and button contrast must pass axe in both themes, including hover/focus and narrow layouts.

## Theme contract
Default is **System**. An external CSP-compatible `theme-init.js` applies the device theme before the application renders; it listens for device and cross-tab preference changes. `ThemePicker` offers হালকা, গাঢ়, ডিভাইস অনুযায়ী, persists `engjatra.theme`, and keeps manual selection independent of later device changes. If storage is unavailable, selection works for the current page. Both applications share this behavior. Student settings expose the full picker; authentication and desktop headers expose compact controls. Admin keeps its picker reachable on phones. Never animate surface colors between themes: transitional contrast can fail even when endpoints pass.

## Typography
- **Hind Siliguri** for Bengali UI/teaching copy; **Inter** for Latin UI and English examples; use bundled font loading or Google Fonts with resilient system fallback, no unnecessary huge font files.
- Mobile minimum main body approximately 16px, Bangla line height ~1.65–1.8, English examples ~1.5. Scale: caption 13/14, body 16, small title 18/20, section title 24, hero 30–36 (responsive). Do not make Hindi-script misrendering or tiny Bengali text.
- Strong language differentiation: English learner sentences on distinct light card/typographic style; Bengali translation behind a tap on later levels, initially visible for beginners. Respect text zoom up to 200%, narrow 320px widths and browser dark mode when supported.

## Shape/spacing/elevation
- Spacing 4,8,12,16,20,24,32,40,48 px multiples as appropriate; plenty of breathing space, no needless giant gaps.
- Inputs/buttons radius 11–12px; content cards 18–20px; auth/hero surfaces 24px; small labels 8px. Buttons minimum ~44px tap height. Focus-visible outline, disabled and loading states, keyboard/tab order.
- Flat subtle shadows, simple outline icons (consistent Lucide-like), 1–2 simple delight animations maximum per interaction; respect `prefers-reduced-motion`.
- Reuse the implemented Card, Notice, Empty, Loading, ErrorBoundary, native Dialog, ThemePicker, shared Auth/PasswordRecovery and SessionProvider. Use the established shell/navigation, field/choice, table, chat and PWA classes. Do not introduce a heavy UI framework.

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
Mobile-first responsive, bottom nav on small screens, wide max-width learning area on desktop; low-bandwidth unit fetch, lazy loading and good perceived speed; no hero videos, no autoplay or heavy animations. Light, dark and System are required across all surfaces. Both palettes and 320px layouts are quality gates.

## Admin design style
Same brand typography/color but sober, accessible tables and filters, confirmation on destructive actions, distinct affected content ID + version, clear unsaved/draft vs deployed/published status. Never imply review status is student-facing.

## Authentication and Bengali editorial standards
Dedicated sign-in, signup and reset screens have one heading and one primary action. Google is a separate provider action; the mode switch is a short secondary prompt. Signup/password reset acknowledgements do not promise email delivery or reveal account existence. Use labelled fields, field-specific validation, correct autocomplete, show/hide password, recoverable network errors and actual loading state. Student uses friendly তুমি copy consistently; admin uses respectful operational wording. Avoid repeated login controls, literal translations, unnecessary technical terms and certification claims. UI copy may change without altering teaching IDs, answers or content releases; uncertain educational edits require editorial review.

## Layout and accessibility
Controlled widths: auth 1440px shell/440px form, application 1320px, lesson 820px. Spacing uses 4/8/12/16/20/24/32/40/48px. Desktop has a compact sidebar; mobile has exactly three student destinations with safe-area padding. Admin has six compact destinations. Wrap Bengali labels and make tables horizontally scroll within their keyboard-focusable container. Keep short headers and values readable; long JSON must not squeeze other columns into single-letter fragments. Buttons/links target about 44px minimum; focus must stay visible. Native dialogs provide browser focus containment, background inertness, Escape, scrolling and restored trigger focus. Honor reduced motion and text-size preferences. Use colour together with text for feedback.

## Performance and verification
Signed-out screens do not load the learning/admin workspace. Lesson/library/review/saved-word modules load on demand; vocabulary library pages show 20 words at a time. Fonts are self-hosted; student preloads its critical Bengali/brand weights. Preserve the public-only PWA design in HANDOFF.md. Target initial student JS <=140 KB gzip and CSS <=10 KB gzip with configured public Auth; investigate regressions rather than weakening scans. LCP <=2.5s, INP <=200ms, CLS <=0.1 remain targets, not guarantees.

`npm run test:e2e` captures light/dark screenshots and checks learning/admin workflows at 320/390/768/1440px; `npm run test:auth-ui` checks 320/375/390/768/1024/1440px with explicit local Auth response mocks. Inspect actual screenshots after changes. `npm run test:production` checks real build/service worker/manifest/installability/private-cache exclusions; deployment tests exercise Wrangler. `npm run test:performance` measures the actual public student origin using cold Chromium, 4x CPU and throttled network; samples are lab evidence, not field Core Web Vitals. Keep external email/OAuth/AI and physical-device installation verification separate.
