# friendly-design — frontend design

Follows: `frontend-design/DESIGN.md`

Visual refresh only. No new feature, flow, state, behaviour, dependency, font file or asset; works from `file://`. All token values, button states, dialog rules and contrast ratios are in `DESIGN.md` (Foundations, Components). This file lists what changes, what must not change, and the copy table.

## Users and top tasks
| User | Task | Frequency |
|---|---|---|
| Focus worker | Start, pause, resume, reset or skip a phase and see the time left | daily |
| Focus worker | Glance at today's session count | daily |
| Focus worker | Change durations or the notification setting | rare |

## Flows
- F1 Run a phase: unchanged. Start → Pause / Resume → 00:00 → next phase idle → Start. Cancel: Reset or Skip, as today. Error: none. Retry: n/a.
- F2 Settings: unchanged. Settings → edit → Save (closes, announces) or Cancel / Esc (closes, nothing saved). Error: inline validation on blur and Save, focus to first bad field. Retry: fix and Save again.
- F3 Notifications blocked: unchanged. Tick the box → permission not granted → box flips off → warning banner → Got it (was Dismiss) or next Start clears it.

## Screens
| Screen | Route | Primary action | Covers ACs |
|---|---|---|---|
| Timer (phase panel) | `index.html` | Start / Pause / Resume | STATE expected behaviour 1 (palette, AA both themes), 2 (buttons, focus), 3 (copy, no behaviour change) |
| Settings dialog | `index.html` → `#settings-dialog` | Save | Expected behaviour 1, 2 (dialog style), 3 |
| `npm test` green | — | — | Expected behaviour 4: copy in `src/core.js` is not changed (phase names, validation text), so core tests are unaffected; developer re-runs and greps `tests/` for any changed string |

## State matrix
| Screen | Empty | Loading | Success | Validation error | System error | No permission |
|---|---|---|---|---|---|---|
| Timer | First run: Focus 25:00, Start, "Today: 0 sessions"; new palette only | none (sync restore) | Phase change: tint/accent cross-fade to the new phase colour; reload catch-up shows the info banner (surface fill, border) | n/a | Corrupt storage: silent defaults, same look | Warning banner: `--color-error` border, new copy, "Got it" |
| Settings dialog | n/a (always prefilled) | none | Closes; live region "Settings saved" | `--color-error` border on the input, message under it in `--color-error` | n/a | Checkbox flips off, warning banner on the timer behind |

## Layout
| Screen | Small (375 px) | Large (1280 px) |
|---|---|---|
| Timer | Same order as today. Panel padding 48 / 24 px (was 32 / 16), gap 24 px (was 16). Primary full width, Reset + Skip one row equal width. Pill buttons | Panel centred, padding 64 / 48 px. Primary min 200 px, secondary min 120 px, centred. Light mode: soft panel shadow |
| Settings dialog | Full-screen sheet, radius 0, padding 24 px; suffix "minutes" still fits beside a 6rem input at 320 px | Centred card max 420 px, radius 28 px, padding 32 px, shadow, warm backdrop |

## Components
- Reuse: every component in `DESIGN.md` (Button, Icon button, Phase panel, Phase label, Timer, Session count, Live region, Inline banner, Dialog, Number field, Checkbox). Restyle through tokens only.
- New: none. New tokens only — `--color-surface-hover`, `--font-display`, `--font-size-title`, `--radius-check`, `--radius-dialog`, `--shadow-panel`, `--shadow-dialog`, `--backdrop` — because the current set has no hover fill, rounded face, shadow or backdrop value.
- Visual changes by component:
  - Button: all variants pill; secondary gains `--color-surface` fill (was transparent) so it reads as a soft button on the tint; ghost hover gains `--color-surface` fill; press scale 0.97 (was 0.98).
  - Icon button: circle; hover `--color-surface-hover`.
  - Timer: `--font-display`, weight 500 (was 600), letter-spacing -0.01em.
  - Phase label: `--font-display`, 18 px (was 20), letter-spacing 0.
  - Banner: padding `--space-3 --space-4`, radius 14 px.
  - Dialog: radius 28 px, shadow, padding 32 px, title 22 px `--font-display`, more space between fields (24 px) and above actions (32 px).
  - Checkbox: checked fill `--accent` with `--on-accent` mark (was `--color-text`); radius 8 px.
- Do not rename (JS or ARIA relies on them): IDs `app`, `panel`, `phase-label`, `timer`, `paused-note`, `banner`, `banner-text`, `banner-dismiss`, `primary-btn`, `reset-btn`, `skip-btn`, `count`, `live`, `settings-btn`, `settings-dialog`, `settings-form`, `settings-title`, `settings-cancel`, `settings-save`, `notify-check`, `focus-min`, `short-min`, `long-min`, `focus-min-error`, `short-min-error`, `long-min-error` (built as `<input id> + "-error"`); attributes `data-phase` (`focus|short|long`), `data-kind` (`info|warning`), `hidden`, `role="timer"`, `aria-live`, `aria-describedby`, `aria-labelledby`. No class is renamed either; keep `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.icon-btn`, `.panel`, `.phase-label`, `.timer`, `.paused-note`, `.count`, `.banner*`, `.field*`, `.suffix`, `.check*`, `.dialog-actions`, `.visually-hidden`.
- Honest limit: the rounded face shows only on Apple systems; on Windows, Android and Linux the friendlier feel comes from colour, radius and spacing alone. Adding a web font would fix that but breaks the no-asset constraint.

## Copy
Format: `current` → **new**. "keep" means the current string is already short and plain. Rows marked **needs user OK** are pinned by an acceptance criterion; the default is keep until the user approves.

| Place | Text |
|---|---|
| `<title>` / tab title (`core.titleFor`) | `<Phase> - mm:ss` → keep (D1) |
| `<h1>` (visually hidden) | `Pomodoro timer` → keep |
| Settings icon `aria-label` | `Settings` → keep |
| Phase names (`core.js` PHASE_NAMES) | `Focus` / `Short break` / `Long break` → keep (title, tests, BR-7) |
| Timer `aria-label` (`app.js` render) | `<Phase>, mm:ss remaining` → **`<Phase>, mm:ss left`** |
| Paused note | `Paused` → keep |
| Primary button | `Start` / `Pause` / `Resume` → keep |
| Reset button | `Reset` → keep ("Start over" would sit next to "Start" and blur the two) |
| Skip button | `Skip` → keep |
| Session count (AC1) | `Today: {n} session(s)` → proposed **`{n} session(s) today`** — **needs user OK**, default keep |
| Banner dismiss | `Dismiss` → **`Got it`** |
| Banner info, reload catch-up (AC20) | `Focus finished at {hh:mm}` → proposed **`Your focus session ended at {hh:mm}`** — **needs user OK**, default keep |
| Banner warning (`WARNING_TEXT`) | `Notifications are blocked in your browser. Sound and the tab title will still alert you.` → **`Notifications are off in your browser. You'll still get a sound and the tab title.`** |
| Live: focus ended | `Focus finished. {Next}, {n} minutes. Press Start when ready.` → **`Focus done. Next up: {next}, {n} minutes. Press Start when you're ready.`** (`{next}` lower-case: "short break", "long break") |
| Live: break ended | `Break finished. Focus, {n} minutes. Press Start when ready.` → **`Break's over. Next up: focus, {n} minutes. Press Start when you're ready.`** |
| Live: restore, running / paused | `{Phase} running, {time} left` / `{Phase} paused, {time} left` → **`Welcome back. {Phase} is running, {time} left.`** / **`Welcome back. {Phase} is paused, {time} left.`** |
| Live: restore, ended while closed | `Focus finished at {hh:mm}. {Next} ready.` → **`{banner text}. {Next} is ready when you are.`** (banner text part follows the AC20 row) |
| Live: settings saved | `Settings saved` → keep |
| Notification title (`alerts.notify`) | `Pomodoro` → keep |
| Notification body, focus ended | `Focus finished. {Next} is ready.` → **`Nice work. Time for a {next}.`** ("short break" / "long break") |
| Notification body, break ended | `{Break} finished. Focus is ready.` → **`Break's over. Ready to focus?`** |
| Dialog title | `Settings` → keep |
| Field labels | `Focus` / `Short break` / `Long break` → keep |
| Field suffix | `min` → **`minutes`** (screen readers read "min" literally; the word is plainer) |
| Validation (AC13, `core.js` DURATION_ERROR) | `Enter a whole number from 1 to 180` → proposed **`Use a whole number from 1 to 180`** — **needs user OK**, default keep (also asserted by core tests) |
| Checkbox label | `Desktop notification` → **`Show a notification when time's up`** |
| Dialog buttons | `Cancel` / `Save` → keep |
| Spoken units | `minute(s)` / `second(s)` → keep |
