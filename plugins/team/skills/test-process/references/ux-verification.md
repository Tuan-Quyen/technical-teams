# UI/UX verification — does it match the design, and can users use it?

> Used by: qa · Read when: UI is in scope at T1/T2

On every screen or command the change touches, with live preview evidence (screenshots, captures, transcripts):

1. **Conformance** — it matches `.team/frontend-design/<slug>.md` and the design system.
2. **Usability** — independent of the design, a real user can finish the task. A usability problem the design caused is still a defect: route it to the designer, not the developer.

## 1. Conformance

| Area | Defect when |
|---|---|
| Screens, flows, links | a designed screen, step or path is missing or different |
| Primary action | missing, hidden, or several competing primaries |
| Content priority | important information buried, wrong emphasis |
| **State matrix** — empty, loading, partial, success, validation error, system/offline error, no permission, edge content | a designed state is missing (blank screen, raw error, endless spinner) or differs |
| Components and their states (default, hover, focus, pressed, disabled, selected, error, loading) | look-alike custom widget, missing state |
| Tokens (color roles, type, spacing, radius, elevation, dark mode) | hard-coded or off-scale values that visibly differ |
| Layout per form factor | overflow, clipping, overlap, horizontal scroll, another form factor's layout |
| Copy | wrong, placeholder, untranslated or inconsistent wording |
| Designed capabilities (search, sort, filter, paging, bulk, cancel, undo) and feedback | a designed capability or pressed/pending feedback missing |

The design has no answer for what you see → a **design question**, not a defect: "PASS pending design decision". No frontend design for the item → conform to the design system and neighbouring screens.

## 2. Usability — Nielsen's 10 heuristics, on every changed flow

Visibility of status (feedback within ~1 s, progress, where am I) · real-world words and formats, not developer terms · control and freedom (cancel, back, undo; no silent data loss, no dead ends) · consistency and platform conventions · error prevention (constraints, defaults, confirm only destructive actions, naming the object) · recognition over recall · efficiency (few steps for frequent tasks, keyboard, bulk) · minimalist design · error messages that say what happened and how to fix it, next to the cause, input kept · help where input is not obvious, empty states that explain, CLI `--help` with examples.

**First-time-user walkthrough** per key task: at each step, will the user know what to do, see how, and understand the feedback? Note every "not sure".

## 3. Accessibility — WCAG 2.2 AA floor

| Check | Pass when |
|---|---|
| Contrast | text ≥4.5:1 (large ≥3:1); UI components and focus ≥3:1 |
| Keyboard | every control reachable and operable, order = visual order, visible focus, no trap, Esc closes overlays, focus returns |
| Names and roles | every control has an accessible name; headings structured; images have alt text or are decorative |
| Status messages | errors and toasts announced (live region, platform announcement) |
| Zoom / font scale | 200% zoom or largest system font: no clipped or overlapping text |
| Targets | ≥24×24 CSS px; ≥44 pt / 48 dp on touch |
| Motion | reduced motion respected; nothing flashes |
| Automated scan | the project's tool if present (axe, Lighthouse, platform scanners); it finds a third of issues, so the checks above still run |

## 4. UX severity

| Severity | Examples |
|---|---|
| blocker | a core task cannot be finished; data loss; a core control with no keyboard or screen-reader path |
| critical | only a workaround most users won't find; UI that misleads into a wrong action |
| major | a designed state missing, broken layout on a required form factor, body-text contrast failure, an error with no recovery |
| minor | token or component inconsistency, unclear copy, small misalignment |
| trivial | polish |

Blocking follows SKILL.md § Severity and blocking. A taste preference is not a defect.
