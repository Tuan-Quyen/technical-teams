# UI/UX verification — does it match the design, and can users actually use it?

QA verifies **two** things on every screen/command the change touches, using the live-preview evidence (screenshots, captures, transcripts) and the running product:

1. **Conformance** — the implementation matches `.team/frontend-design/<slug>.md` (design system + the work item's section).
2. **Usability** — independent of the design: a real user can complete the task efficiently and without errors. A deviation from usability that the design itself caused is still a defect; route it to the designer (escalation), not to the developer.

## 1. Design conformance (against frontend design)

| Area | Check | Defect when |
|---|---|---|
| Screens + flows | every screen and step of each designed flow exists; navigation between them as designed; URLs/deep links as listed | a screen, step or path is missing or different |
| Primary action | one clear primary action per screen, where and as the design says | missing, hidden, or several competing primaries |
| Content priority | order and hierarchy of content as specified (what is first/biggest) | important info buried, wrong emphasis |
| **State matrix** | every state designed for the screen shows correctly: empty, loading, partial, success, validation error, system/offline error, no permission, edge content | a state is missing (blank screen, raw error, endless spinner) or differs |
| Components | the named components/library are used (no look-alike custom widgets); component states: default, hover, focus, pressed, disabled, selected, error, loading | wrong component, missing state |
| Tokens | colors by role, type scale, spacing scale, radius, elevation from the design system/theme; dark mode values if in scope | hard-coded or off-scale values that visibly differ (compare screenshots side by side; measure spacing/sizes in the capture when in doubt) |
| Layout per form factor | each width/device/window size as designed: stacking, collapsing, navigation pattern | overflow, clipping, overlaps, horizontal scroll, layout of another form factor |
| Copy | labels, button verbs, empty/error texts, confirmations as written; glossary terms consistent; language/locale | wrong, placeholder, untranslated, inconsistent wording |
| Completeness | capabilities listed for the screen pattern (search, sort, filter, pagination, bulk actions, cancel, undo…) that frontend design marked as designed | designed capability not implemented |
| Motion/feedback | pressed/pending feedback, transitions as specified | no feedback on actions |

frontend design has no answer for what you see (an undesigned state, an ambiguous layout) → **design question**, not a defect: list it under "PASS pending design decision" (test-process §3).

No frontend design for this work item (small mode, legacy screen) → conform to the existing design system and neighbouring screens; check usability below.

## 2. Usability — Nielsen's 10 heuristics (inspect every changed flow)

| # | Heuristic | What to look for in the running product |
|---|---|---|
| H1 | Visibility of system status | every action gives feedback within ~1 s (pressed, pending, progress); long tasks show progress; current location visible (active nav, title, breadcrumb, step x of y) |
| H2 | Match between system and the real world | user's words, not developer terms ("Entity", "Submit", error codes); natural order of information; familiar formats for dates, money, phone in the user's locale |
| H3 | User control and freedom | cancel, back, close, undo for reversible actions; leaving a flow does not lose data silently; no dead ends |
| H4 | Consistency and standards | same term/icon/position for the same thing across screens; platform conventions (iOS HIG, Material, desktop menus/shortcuts, web link vs button, CLI flags `--help`/`-h`) |
| H5 | Error prevention | constraints and defaults that prevent mistakes; disabled impossible actions with a reason; confirmation only for destructive irreversible actions, naming the object |
| H6 | Recognition rather than recall | options visible; no need to remember values between screens; recent items, autocomplete, sensible prefill |
| H7 | Flexibility and efficiency of use | frequent task in few steps; keyboard shortcuts, bulk actions, search for power users; no forced long paths |
| H8 | Aesthetic and minimalist design | only relevant information; clear hierarchy; no clutter, no competing emphasis; whitespace used to group |
| H9 | Help users recognize, diagnose, and recover from errors | plain-language messages that say what happened and how to fix, next to the cause, input kept, retry offered |
| H10 | Help and documentation | contextual hints for non-obvious inputs; empty states that explain; help/docs reachable; CLI `--help` with examples |

**First-time-user walkthrough** (cognitive walkthrough, per key task): at each step ask — will the user know what to do? will they see how to do it? will they understand the feedback? Note every step where the answer is "not sure".

**Task metrics** (when comparing alternatives or for core flows): steps/clicks to complete, input fields required, time on the scripted path, number of error states a normal user hits.

## 3. Accessibility (inclusivity) — WCAG 2.2 AA floor

| Check | How |
|---|---|
| Contrast | text ≥ 4.5:1 (large text ≥ 3:1), UI components and focus indicators ≥ 3:1 — check suspicious colors from the screenshot |
| Keyboard | every control reachable and operable, order = visual order, visible focus, no traps, Esc closes overlays, focus returns after closing |
| Names and roles | every control has an accessible name (labels, `aria-label`, `contentDescription`, `accessibilityLabel`, `Semantics`); headings structured; images have alt text or are decorative |
| Status messages | errors and toasts announced (`role="alert"`/`status`, live regions, platform announcements) |
| Zoom / font scale | 200 % zoom (web), largest system font (mobile/desktop) — no clipped or overlapping text |
| Targets | ≥ 24×24 CSS px (WCAG 2.2), ≥ 44 pt / 48 dp on touch platforms |
| Motion | respects reduced motion; nothing flashes |
| Automated scan | run the project's tool if present (axe via Playwright, Lighthouse, Android Accessibility Scanner, `flutter test` semantics checks); automated scans find ~30–40 % of issues — manual checks above still required |

## 4. Severity of UX defects

| Severity | UX examples |
|---|---|
| Blocker | user cannot complete a core task; data loss; inaccessible core control (no keyboard/screen-reader path) |
| Critical | task completable only with a workaround most users won't find; misleading UI causing wrong actions (e.g. destructive button styled as primary without confirmation) |
| Major | designed state missing (blank empty state, raw error), broken layout on a required form factor, contrast failure on body text, H9 errors with no recovery |
| Minor | inconsistency with tokens/components, unclear copy, small misalignment, missing shortcut |
| Trivial | polish that does not affect use |

Blocker/critical/major → FAIL (or design escalation if the design caused it). Minor/trivial → listed for the main session.
