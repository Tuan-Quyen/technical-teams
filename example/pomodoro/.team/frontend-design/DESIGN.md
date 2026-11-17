# Design system

> Owner: **team-designer**. The UI rules every screen follows. Per-item screens live in `frontend-design/<slug>.md`.

Plain HTML/CSS/JS, no build, opened from `file://`: every token is a CSS custom property set on `:root` and overridden under `@media (prefers-color-scheme: dark)`. Dark mode follows the OS only, no toggle (Q3). The phase accent is swapped by `data-phase="focus|short|long"` on `#app`, which remaps `--accent`, `--accent-hover`, `--tint`; components read only `--accent*` / `--tint`, never a `--phase-*` token. `:root` also sets `--accent*` / `--tint` to the focus values so the dialog (outside `#app`) has them (R-01).

Visual language (since friendly-design, 2026-11-17): warm neutrals instead of cool grey, a tomato / sage / soft-blue phase palette instead of alarm red / deep green / navy, pill buttons, larger radii, more whitespace, soft shadow in light mode. No web fonts, images or external assets.

Contrast ratios are computed from the hex values with the WCAG 2.x relative-luminance formula, rounded down; QA re-checks them with a tool on the built page.

## Foundations
| Token | Value | Use |
|---|---|---|
| **Colour — light (`:root`)** | | |
| `--color-bg` | `#FBF8F4` | Page background (warm off-white) |
| `--color-surface` | `#FFFFFF` | Dialog, inputs, phase pill, secondary button fill, banner |
| `--color-surface-hover` | `#F5F0EA` | Hover fill for secondary, ghost and icon buttons |
| `--color-text` | `#2B2622` | Body text, timer digits. 14.1:1 on bg, 14.9:1 on surface, ≥ 13.2:1 on every tint, 13.3:1 on surface-hover |
| `--color-text-muted` | `#6B6259` | Paused note, session count, suffix. 5.6:1 on bg, 5.9:1 on surface, ≥ 5.2:1 on every tint |
| `--color-border` | `#8C8279` | Input, checkbox, secondary-button and banner borders. 3.7:1 on surface, 3.5:1 on bg, ≥ 3.3:1 on every tint (1.4.11) |
| `--color-divider` | `#ECE6DF` | Decorative separators only, never a control boundary |
| `--color-error` | `#B42318` | Validation text, invalid-input border, warning-banner border. 6.5:1 on surface. Always with text, never colour alone |
| `--color-focus-ring` | `#2B2622` | Focus outline. ≥ 13.2:1 against bg, surface and every tint |
| `--color-disabled-bg` / `--color-disabled-text` | `#ECE6DF` / `#766D64` | Disabled controls (exempt from contrast, still readable) |
| `--shadow-panel` | `0 1px 2px rgb(43 38 34 / 0.04), 0 12px 32px rgb(43 38 34 / 0.06)` | Phase panel (decorative) |
| `--shadow-dialog` | `0 24px 48px rgb(43 38 34 / 0.18)` | Dialog card |
| `--backdrop` | `rgb(43 38 34 / 0.40)` | `dialog::backdrop` |
| **Phase accents — light** | | |
| `--phase-focus-accent` / `-hover` / `-tint` | `#BF3B26` / `#A3311F` / `#FDEEE9` | Focus: tomato. White on accent 5.4:1, on hover 6.9:1; accent on surface 5.4:1, on its tint 4.8:1 |
| `--phase-short-accent` / `-hover` / `-tint` | `#2B7656` / `#1F5E44` / `#E9F5EE` | Short break: sage. White on accent 5.4:1, on hover 7.6:1; accent on surface 5.4:1, on its tint 4.9:1 |
| `--phase-long-accent` / `-hover` / `-tint` | `#3563A8` / `#284E86` / `#ECF1FA` | Long break: soft blue. White on accent 5.9:1, on hover 8.3:1; accent on surface 5.9:1, on its tint 5.2:1 |
| `--on-accent` (light) | `#FFFFFF` | Text and check mark on accent fills (ratios above) |
| **Colour — dark (`prefers-color-scheme: dark`)** | | |
| `--color-bg` | `#1A1816` | Page background (warm near-black) |
| `--color-surface` | `#24211E` | Dialog, inputs, phase pill, secondary fill, banner |
| `--color-surface-hover` | `#2E2A26` | Hover fill |
| `--color-text` | `#F2EDE7` | Body, digits. 15.2:1 on bg, 13.7:1 on surface, ≥ 12.9:1 on every tint, 12.2:1 on surface-hover |
| `--color-text-muted` | `#B5ACA2` | Secondary text. 7.9:1 on bg, 7.1:1 on surface, ≥ 6.7:1 on every tint |
| `--color-border` | `#8F857B` | Control borders. 4.8:1 on bg, 4.4:1 on surface, ≥ 4.1:1 on every tint |
| `--color-divider` | `#3A3530` | Decorative only |
| `--color-error` | `#FFB4A8` | Validation text and border. 9.4:1 on surface |
| `--color-focus-ring` | `#F2EDE7` | Focus outline. ≥ 12.9:1 against bg, surface and every tint |
| `--color-disabled-bg` / `--color-disabled-text` | `#3A3530` / `#A0968C` | Disabled controls |
| `--shadow-panel` | `none` | Shadows do not read on dark; the tint separates the panel |
| `--shadow-dialog` | `0 24px 48px rgb(0 0 0 / 0.50)` plus `1px solid var(--color-divider)` border | Dialog card edge |
| `--backdrop` | `rgb(0 0 0 / 0.60)` | `dialog::backdrop` |
| `--phase-focus-accent` / `-hover` / `-tint` | `#FF9B85` / `#FFB3A1` / `#2E1F1A` | On-accent on accent 8.6:1, on hover 10.2:1; accent on surface 7.8:1, on its tint 7.7:1 |
| `--phase-short-accent` / `-hover` / `-tint` | `#7DD3A8` / `#9FE0BF` / `#1A2A22` | On-accent on accent 9.9:1, on hover 11.7:1; accent on surface 8.9:1, on its tint 8.4:1 |
| `--phase-long-accent` / `-hover` / `-tint` | `#9DBDF5` / `#BAD1F8` / `#1C2333` | On-accent on accent 9.3:1, on hover 11.4:1; accent on surface 8.4:1, on its tint 8.2:1 |
| `--on-accent` (dark) | `#1A1816` | Dark text on light accent fills |
| **Typography (system fonts only)** | | |
| `--font-sans` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | Body, buttons, inputs |
| `--font-display` | `ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | Timer digits, phase pill, dialog title. Rounded where the OS has it (Apple); elsewhere it falls back to the system face. Local fonts only, never downloaded |
| `--font-timer-size` | `clamp(4.5rem, 22vw, 9rem)` (72 to 144 px) | mm:ss display |
| `--font-timer-weight` / features | `500`; `font-variant-numeric: tabular-nums; letter-spacing: -0.01em; line-height: 1` | Lighter than before (was 600); tabular so width never jitters |
| `--font-size-phase` | `1.125rem` (18 px), weight 600, letter-spacing 0 | Phase pill |
| `--font-size-title` | `1.375rem` (22 px), weight 600 | Dialog `<h2>` |
| `--font-size-body` | `1rem` (16 px), line-height 1.5 | Body, buttons, inputs (16 px stops iOS zoom) |
| `--font-size-small` | `0.875rem` (14 px), line-height 1.45 | Paused note, count, banner, validation |
| Scaling | All sizes in `rem`; survives 200 % zoom and 320 px reflow (1.4.4, 1.4.10) | |
| **Spacing (4 px base)** | | |
| `--space-1` … `--space-8` | `4, 8, 12, 16, 24, 32, 48, 64 px` | Gaps and padding; nothing off-scale |
| `--gutter` | `--space-4` (16 px) phone, `--space-5` (24 px) ≥ 768 px | Page side padding |
| **Shape and size** | | |
| `--radius-control` | `14px` | Inputs, banner |
| `--radius-check` | `8px` | Checkbox box |
| `--radius-panel` | `32px` | Phase panel |
| `--radius-dialog` | `28px` | Dialog card (0 on the phone sheet) |
| `--radius-pill` | `999px` | Every button (incl. icon button, which becomes a circle), phase pill |
| `--control-height` | `48px` (min) | Every button and input; ≥ 44×44 px target |
| `--focus-ring` | `3px solid var(--color-focus-ring)`, `outline-offset: 3px` | `:focus-visible` only; follows the pill shape |
| **Motion** | | |
| `--duration-fast` / `--duration-base` | `120ms` / `240ms` | Hover/press; phase cross-fade and dialog fade |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | All transitions |
| Reduced motion | All durations `0ms`, no press scale | 2.3.3; nothing flashes (2.3.1) |
| Timer digits | Never animated | Each second is a plain text change |

## Components
| Component | Source (library / path) | Variants | Notes |
|---|---|---|---|
| Button | `styles.css` `.btn` on native `<button>` | primary, secondary, ghost, disabled | Pill (`--radius-pill`), `--control-height`, padding `0 --space-5`, weight 600. **Primary** `.btn-primary`: fill `--accent`, text `--on-accent`, no border; hover fill `--accent-hover`; active `--accent-hover` + `scale(0.97)`. **Secondary** `.btn-secondary`: fill `--color-surface`, 1.5 px `--color-border`, text `--color-text`; hover fill `--color-surface-hover`; active same + `scale(0.97)`. **Ghost** `.btn-ghost`: transparent, text `--accent`; hover fill `--color-surface` and underline; active + `scale(0.97)`. **Focus** (all): `--focus-ring` on `:focus-visible`, fill unchanged. **Disabled** (`[disabled]`, `[aria-disabled="true"]`): `--color-disabled-*`, no border, no hover, no scale, `cursor: default` (not used today; kept for completeness). Exactly one primary per view |
| Icon button | `.icon-btn` | default | 48×48 circle, transparent, icon `currentColor` (`--color-text`); hover `--color-surface-hover`; same focus and press as Button. Settings gear, `aria-label` |
| Phase panel | `<main class="panel">` | focus, short, long | `--tint` fill, `--radius-panel`, `--shadow-panel`; padding `--space-7 --space-5` (phone), `--space-8 --space-7` (≥ 768 px); gap `--space-5`. Label text always names the phase (1.4.1) |
| Phase label | `.phase-label` | focus, short, long | Pill: `--color-surface` fill, `--accent` text, `--font-display`, `--font-size-phase`, padding `--space-1 --space-4` |
| Timer display | `.timer`, `role="timer"` | idle, running, paused | `--font-display`, `--font-timer-*`, `--color-text`. Paused: muted "Paused" note under the digits, not blinking. Not a live region |
| Session count | `.count` | default | Muted small text, plain |
| Live region | `#live`, `aria-live="polite" aria-atomic="true"`, visually hidden | — | The only announcer; in the DOM from first render |
| Inline banner | `.banner` | info, warning (`data-kind`) | `--color-surface` fill, 1.5 px `--color-border` (warning: `--color-error`), `--radius-control`, padding `--space-3 --space-4`, small text, icon left, ghost dismiss right in `--color-text` |
| Dialog | native `<dialog>` modal | default | Card: `--color-surface`, `--radius-dialog`, `--shadow-dialog`, padding `--space-6`, `max-width: 420px`; backdrop `--backdrop`; fade-in `--duration-base`. Below 600 px: full-screen sheet, radius 0, padding `--space-5`. Title `<h2>` in `--font-display` / `--font-size-title`, `margin-bottom: --space-5`. Fields `margin-bottom: --space-5`. Actions row: Cancel (secondary) then Save (primary), gap `--space-3`, `margin-top: --space-6`. Focus to first field on open, Esc = Cancel, focus back to Settings on close |
| Number field | `<input type="text" inputmode="numeric">` + `<label>` | default, invalid | `--color-surface`, 1.5 px `--color-border`, `--radius-control`, width 6rem; suffix "minutes" muted, outside the input. Invalid: `--color-error` border, `aria-invalid`, message via `aria-describedby` |
| Checkbox | native checkbox + `.check-box` | off, on, disabled | 24 px box, `--radius-check`, 1.5 px `--color-border` on `--color-surface`. On: fill `--accent`, check mark `--on-accent` (state shown by the mark, not colour only). Focus ring on the box |

## Layout
- Form factors: 375 px (phone), 768 px (tablet), 1280 px (desktop); reflows at 320 px with no horizontal scroll.
- One screen, one column, centred; phase panel `max-width: 480px`; page side padding `--gutter`.
- Panel order: phase label → timer → paused note → banner → primary → secondary row (Reset, Skip) → session count. Settings icon button top-right, outside the panel.
- Phone: panel full width minus gutters; primary full width; Reset and Skip share one row, equal width.
- ≥ 768 px: panel centred in the viewport; primary `min-width: 200px`; secondary buttons `min-width: 120px`, centred.
- Dialog: full-screen sheet below 600 px; centred card above.
- Nothing fixed or sticky over content (2.4.11).

## Patterns
| Pattern | Rule |
|---|---|
| One primary action | Panel: Start, Pause or Resume. Reset is secondary, Skip is ghost. Dialog: Save primary, Cancel secondary |
| Phase change | Accent and tint cross-fade over `--duration-base` (instant under reduced motion); label text changes; live region announces; tab title updates; focus stays put |
| Tab title | Always "<Phase> - mm:ss" in every state (D1), phase names as in the label |
| Empty / first run | None needed: Focus 25:00, Start, session count 0. No onboarding, no permission prompt on load |
| Loading | None visible: state is read before first paint |
| Error — corrupt stored data | Silent fallback to defaults |
| Error — notifications blocked / unsupported | Setting flips back off; warning banner (Copy); sound and title still work |
| Form validation | On Save and on blur, not per keystroke. Save stays clickable; invalid Save shows the message under each bad field and focuses the first |
| Confirmation | None; Reset and Skip are cheap to redo |
| Success feedback | Settings saved: dialog closes, live region announces. No toast |

## Copy and accessibility
- Confirmed by the user, 2026-11-17: no progress ring (Q1), no keyboard shortcuts (Q2), dark mode follows the OS (Q3), tab title "<Phase> - mm:ss" (D1).
- Voice: warm, short, plain. Sentence case. No exclamation marks, no guilt, no emoji (they render differently per OS, screen readers read their names aloud, and they would clutter the tab title). Talk to the user as "you"; never "we".
- Button labels: Start, Pause, Resume, Reset, Skip, Save, Cancel; the banner dismiss is "Got it" (an acknowledgement reads warmer than "Dismiss" for a message that needs no action).
- Fixed strings: phase names "Focus", "Short break", "Long break" (in core, title and tests). Strings pinned by acceptance criteria — count "Today: {n} session(s)" (AC1), validation "Enter a whole number from 1 to 180" (AC13), catch-up "Focus finished at {hh:mm}" (AC20) — stay exact unless the user approves a change. All other strings: see the copy table in `frontend-design/friendly-design.md`.
- Live-region messages: one per event, durations in words, never "05:00".
- Contrast (WCAG 2.2 AA): text ≥ 4.5:1, control borders and focus ring ≥ 3:1 against adjacent colours; every pair in Foundations meets this in both themes (lowest: accent on its light tint 4.8:1; border on light tint 3.3:1). Any new colour is checked before use.
- Keyboard: native buttons and inputs only; Tab order Settings → primary → Reset → Skip (banner Got it before primary when shown); dialog fields → checkbox → Cancel → Save. Esc closes the dialog. No global single-key shortcuts.
- Focus: `--focus-ring` on `:focus-visible` everywhere; the primary button keeps focus when its label changes.
- Screen readers: one `<h1>` "Pomodoro timer" (visually hidden); timer `role="timer"`, not live; icons `aria-hidden`.
- Sound: one tone under 3 s, never the only cue.
- Language: `<html lang="en">`.
