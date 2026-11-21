# Design system

> Owner: **team-designer**. The UI rules every screen follows. Per-item screens live in `frontend-design/<slug>.md`.
> **Budget:** ≤ 150 lines. Tokens and rules as tables; no per-screen detail.

## Foundations
- Tailwind v4 via `@tailwindcss/vite`; no `tailwind.config` JS file. `src/index.css` = `@import "tailwindcss";` + `@theme { … }`: tokens below as `--color-*`, `--font-*`, `--radius-*`, `--ease-*` (hex values; v4 opacity modifiers use `color-mix`, so `bg-surface/80`, `bg-accent/14` work without RGB triplets).
- Active phase sets `data-phase="focus|short|long"` on `<html>`; plain CSS rules `[data-phase="focus"] { --accent: #FF6B6B }` (etc.) swap `--accent`; `@theme inline { --color-accent: var(--accent); }` exposes it as `bg-accent`, `text-accent`, `ring-accent`. Components use `accent` only, never a phase name.
- Custom variant `@custom-variant short (@media (max-height: 560px));` for landscape phones.
- Dark only: no light tokens, `color-scheme: dark`. Contrast ratios below measured against `bg.base` / `bg.elevated`.

| Token | Value | Use |
|---|---|---|
| color.bg.base | `#0A0B10` | Page background, fullscreen view |
| color.bg.surface | `#12141B` | Cards, control bar, settings sheet body |
| color.bg.elevated | `#1A1D26` | Inputs, secondary buttons, inline hints |
| color.border.subtle | `#262A35` | Dividers, card outline (decorative only) |
| color.border.strong | `#6B7280` | Input, toggle-off track outline (3.8:1 on surface) |
| color.text.primary | `#F4F5F7` | Timer digits, headings, labels (≥ 15:1) |
| color.text.secondary | `#A1A7B3` | Helper text, inactive tab labels (≥ 6.9:1) |
| color.text.muted | `#858C9A` | Range hints, units "min" (≥ 4.9:1 on elevated) |
| color.text.onAccent | `#0A0B10` | Text/icons on filled accent buttons (≥ 7:1) |
| color.phase.focus | `#FF6B6B` coral | `--accent` when Focus (7.1:1 on base) |
| color.phase.short | `#2DD4BF` teal | `--accent` when Short Break (10.5:1) |
| color.phase.long | `#A78BFA` violet | `--accent` when Long Break (7.2:1) |
| color.accent.soft | `--accent` at 14 % alpha | Active tab pill, toggle-on glow, selected dot halo |
| color.ring.track | `#FFFFFF` at 8 % | Unfilled ring track (decorative; progress carries meaning) |
| color.status.error | `#FCA5A5` + `AlertCircle` icon | Inline validation text (never colour alone) |
| color.status.warn | `#FBBF24` + `BellOff` icon | Notifications-blocked hint |
| color.focusRing | `--accent`, 2 px, offset 2 px `bg.base` | Every focusable element (`focus-visible` only) |
| font.family | Inter (variable), fallback `ui-sans-serif, system-ui, sans-serif` | All text; self-hosted committed `src/assets/fonts/InterVariable.woff2` (OFL), `font-display: swap` |
| font.timer | Inter 300, `tabular-nums`, tracking −0.02em, line-height 1 | Countdown digits; width never shifts per second |
| font.size.timer | `clamp(4.5rem, 18vw, 8rem)` (72–128 px) | Main view |
| font.size.timerFocus | `clamp(6rem, 24vw, 13rem)` (96–208 px) | Fullscreen focus view |
| font.size.title / body / label / caption | 20 / 16 / 14 / 12 px; weights 600 / 400 / 500 / 500 | Sheet title / text / buttons, tabs / hints, uppercase phase eyebrow (+0.08em) |
| space.* | Tailwind 4 px scale; used steps 1, 2, 3, 4, 6, 8, 12, 16 | Gaps: controls 12–16 px, sections 32–48 px |
| radius.sm / md / lg / xl / full | 8 / 12 / 16 / 24 px / 9999 | Inputs / buttons, hints / cards / sheet / icon buttons, pills, dots |
| elevation.0 | none, `bg.base` | Page |
| elevation.1 | `bg.surface` + 1 px `border.subtle` | Cards, control bar |
| elevation.3 | `bg.surface` + `0 24px 64px rgb(0 0 0 / .6)`; scrim `#000` 60 % + `backdrop-blur(8px)` | Settings sheet / dialog |
| glow.accent | `0 0 48px` `--accent` at 25 % | Ring progress stroke, primary button (running only) |
| motion.fast / base / slow / phase | 120 / 200 / 320 / 600 ms | Hover, press / tabs, toggles / sheet / phase colour crossfade |
| motion.ease | `cubic-bezier(0.22, 1, 0.36, 1)`; spring `{stiffness 380, damping 34}` | Ease-out for enter; spring for sheet and active-tab pill |

## Components
- Paths per system design: primitives in `src/components/ui/`, feature components in `src/components/`. Animation: package `motion`, import `{ motion, AnimatePresence, MotionConfig }` from `motion/react` (never `framer-motion`). Icons: Lucide React, 20 px (24 px in focus view), `strokeWidth 1.75`, `aria-hidden` when a label exists.

| Component | Source (library / path) | Variants | Notes |
|---|---|---|---|
| ProgressRing | new `ProgressRing.tsx` (SVG + `motion.circle` from `motion/react`) | default, focusView (larger) | Size `min(78vw, 56vh, 320px)` mobile, 380 px ≥ lg; stroke 8 / 10 px, round cap, starts 12 o'clock, fills clockwise; progress = elapsed / total from timestamps (POMO-AC7); animates `strokeDashoffset` only; Pause freezes exactly, Resume continues from same value; `aria-hidden`, the digits carry meaning |
| TimerDisplay | new `TimerDisplay.tsx` | default, focusView | `MM:SS` (≥ 60 min → `MMM:SS` e.g. `120:00`); centred inside ring; phase eyebrow above, state caption below ("Paused"); `role="timer"`, `aria-live="off"` |
| Button | new `ui/Button.tsx` | primary, secondary, ghost | Height 48 px (min 44), radius md, label 14/500 + optional leading icon; primary = filled `--accent`, `text.onAccent`; secondary = `bg.elevated` + `border.subtle`; ghost = text only; press scale 0.97; disabled 40 % opacity, `aria-disabled` |
| IconButton | new `ui/IconButton.tsx` | secondary, ghost | 48 × 48 px circle, icon 20 px; required `aria-label`; tooltip via `title` on desktop only |
| TimerControls | new `TimerControls.tsx` | main, focusView | Groups Reset · Primary control · Skip in one row (two rows below); shared by main screen and FocusView |
| Primary control (Start/Pause/Resume) | Button primary, xl, in `TimerControls.tsx` | idle → `Play` "Start"; running → `Pause` "Pause"; paused → `Play` "Resume" | 56 px tall, min-width 160 px; one per screen; label swap crossfades 120 ms, width fixed to avoid layout shift |
| Reset / Skip | IconButton secondary, in `TimerControls.tsx` | `RotateCcw` "Reset timer", `SkipForward` "Skip to next phase" | Flank the primary control; debounce-safe (POMO-E3) |
| PhaseTabs | new `PhaseTabs.tsx` | Focus, Short Break, Long Break | Segmented pill, height 40 px; active = `accent.soft` pill (shared `layoutId` slide) + `text.primary`; inactive `text.secondary`; **display only** (POMO-D1, BR-10): `<ol aria-label="Phase">` of `<li>`, active `aria-current="step"`; not buttons, not `role="tab"`, not focusable, no hover / pointer / focus styling, `cursor: default` |
| CycleDots | new `CycleDots.tsx` | 0–4 filled | 4 dots 10 px, gap 8 px; done = filled `--accent`; current Focus = 2 px `--accent` outline; pending = `border.strong` outline; visible text "2/4" beside; `aria-label="2 of 4 focus sessions completed"` |
| SettingsSheet | new `SettingsSheet.tsx` (`AnimatePresence` from `motion/react`) | bottom sheet < 640 px, centred dialog ≥ 640 px (max-w 420) | `role="dialog"`, `aria-modal`, title "Settings"; focus trap, Esc / scrim = Cancel, focus returns to `Settings` icon button; footer: Cancel (secondary) + Save (primary); sheet has drag handle, max-height 90 dvh, scrolls inside |
| NumberField | new `ui/NumberField.tsx` | Focus 1–120, Short 1–30, Long 1–60 | Label + `Minus` / `Plus` 44 px steppers + `input inputmode="numeric"` 64 px wide + unit "min"; hint "1–120 min" `text.muted`; error replaces hint, `aria-invalid`, `aria-describedby` |
| Toggle | new `ui/Toggle.tsx` | Auto-start, Sound | `role="switch"`, `aria-checked`; track 44 × 24, thumb 20; on = `--accent` track, off = `bg.elevated` + `border.strong`; whole row (label + switch) is the 44 px hit area; icons `Volume2` / `VolumeX` for Sound |
| InlineHint | new `ui/InlineHint.tsx` | info (`Info`), warn (`BellOff`) | Row inside Settings, `bg.elevated`, radius md, 12/14 px text; used for "notifications blocked" (POMO-AC15) |
| FocusView | new `FocusView.tsx` | native fullscreen of `<html>`, in-app overlay fallback (POMO-E7) | Only phase eyebrow, ring, digits, primary + Reset/Skip; `bg.base`; exit `Minimize2` IconButton top-right "Exit focus mode", 60 % opacity after 3 s idle (keeps ≥ 3:1, WCAG 1.4.11), 100 % on pointer move / focus; Esc exits |
| AppHeader | new `AppHeader.tsx` | – | App name left (16/600), right: `Maximize2` "Enter focus mode", `Settings` "Open settings" IconButtons |

## Layout
- Form factors: 360 px (min, POMO-AC22), 768 px, 1280 px; Tailwind v4 default breakpoints `sm 40rem`, `md 48rem`, `lg 64rem`, `xl 80rem` (640 / 768 / 1024 / 1280 px); extra `short:` custom variant (Foundations) for landscape phones.
- Single screen, one column, centred, max content width 560 px; side gutter 16 px (< sm), 24 px (≥ sm).
- Vertical order: AppHeader → PhaseTabs → ProgressRing with TimerDisplay → CycleDots → controls row (Reset · Primary · Skip).
- Mobile: controls row sits in the lower third (thumb zone), `padding-bottom: env(safe-area-inset-bottom)`; uses `100dvh`, no horizontal scroll.
- Desktop ≥ lg: whole stack vertically centred in viewport; ring 380 px; background radial `--accent` 6 % glow behind ring.
- `short` height: ring shrinks to `min(56vh, 240px)`, gaps halve, tabs stay.
- FocusView: ring + digits centred, controls below, nothing else; same layout in native and fallback modes.

## Patterns
| Pattern | Rule |
|---|---|
| Empty / first load | Never empty: defaults Focus 25:00, idle, 0/4, ring track only (POMO-AC1) |
| Loading | No spinner; state restores synchronously from LocalStorage before first paint; font swap must not shift digits (tabular, fixed box) |
| Idle / running / paused | Idle: full ring track, primary "Start". Running: progress glows. Paused: ring + digits at 60 % opacity, caption "Paused", primary "Resume" |
| Phase change | `--accent` crossfades over `motion.phase`; tabs pill slides; ring resets to 0 with 320 ms ease; no toast component — alert = sound + notification + live-region announcement + TimerDisplay caption |
| Form validation | Validate on blur and on Save; invalid field shows error, Save does not close the sheet, invalid field keeps the previous saved value (POMO-AC12); focus moves to first invalid field |
| Error (storage / audio / notification failure) | Silent fallback, no error UI (POMO-E2, POMO-E6, POMO-AC15); only persistent hints, both in Settings: notification status (POMO-AC15) and storage unavailable (S1, POMO-AC26) |
| No permission (notifications) | InlineHint warn in Settings: "Notifications are blocked in your browser settings. Sound alerts still work." Asked on first Start (POMO-E5) or via the Settings "Allow notifications" button while permission is `default` (POMO-AC25) |
| Unsupported (fullscreen) | `Maximize2` opens in-app FocusView overlay instead; button never hidden silently (POMO-E7) |
| Document title | Running/paused: `12:34 · Focus — Pomodoro`; idle: `Pomodoro` (POMO-E12) |
| Motion | Animate only `transform`, `opacity`, `stroke-dashoffset`, colour; no layout animation in the timer path; ring tween never blocks the timestamp clock (G-4) |
| Reduced motion | `MotionConfig reducedMotion="user"` + `prefers-reduced-motion`: ring steps once per second without easing, no glow pulse, no scale on press, sheet fades 120 ms instead of slide, tab pill jumps, phase colour swaps instantly (POMO-E11) |

## Copy and accessibility
- Voice: short, calm, English, sentence case; verbs on buttons: Start, Pause, Resume, Reset, Skip, Save, Cancel.
- Phase names exactly: "Focus", "Short Break", "Long Break". Notification: "Focus finished — Short Break next".
- Errors say the fix: "Enter a whole number from 1 to 120."
- WCAG 2.2 AA: text ≥ 4.5:1, UI parts and focus ring ≥ 3:1 (tokens above meet it); phase also shown as text, never colour alone.
- Targets ≥ 44 × 44 px (2.5.8 exceeds 24 px minimum); 8 px min gap between adjacent targets.
- Keyboard: logical Tab order = visual order; all controls native `<button>` / `<input>`; Enter/Space activate the focused control (native); Esc closes sheet and exits FocusView; no keyboard trap outside the open dialog; no global shortcuts (POMO-D2, POMO-AC24).
- Screen readers: digits not announced each second; one hidden `role="status"` polite region in `App.tsx` (no LiveAnnouncer component) announces state and phase changes ("Focus started", "Paused", "Short Break, 5 minutes").
- Text resizes to 200 % without loss; timer uses `rem` / `clamp`, never fixed px.
- Resolved (user 2026-11-19, BR-10): POMO-D1 phase tabs display only, Skip is the only manual phase change; POMO-D2 no keyboard shortcuts.
