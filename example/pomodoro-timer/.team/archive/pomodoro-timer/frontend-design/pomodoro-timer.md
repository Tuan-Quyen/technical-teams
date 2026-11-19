# pomodoro-timer — frontend design

Follows: `frontend-design/DESIGN.md`

> **Budget:** ≤ 150 lines per item. One table row per screen state; big work → one file per milestone (`<slug>-m2.md`).

- Decisions: phase tabs display only, Skip is the only manual phase change (Q-D1, BR-10); no keyboard shortcuts (Q-D2, AC24); Auto-start default on.
- Toast: **not used** — no AC triggers one and AC15 forbids an error. Phase-end and restored-end feedback = sound + notification + live region + TimerDisplay caption. Removed from DESIGN.md.

## Users and top tasks
| User | Task | Frequency |
|---|---|---|
| Focus worker | Start / pause / resume, skip or reset a phase; run a 4-session cycle | daily |
| Focus worker | Enter / exit focus mode | daily |
| Focus worker | Change durations, Auto-start, Sound; allow notifications | rare |

## Flows
- F1 Run a cycle: load → Focus 25:00 idle 0/4 → Start (first time: browser permission prompt; timer runs immediately, never waits for the prompt; same click arms audio) → running → 00:00 → chime (if Sound on) + notification (if granted) + announcement → next phase: Auto-start on = running, off = idle with caption "<Phase> finished" and primary "Start" → after Focus #4 Long Break, counter 4/4 → after Long Break Focus 0/4.
- F2 Pause: Pause → frozen, dimmed, "Paused" → Resume continues from the same value. Cancel: n/a.
- F3 Reset / Skip: Reset → current phase full duration, idle, counter unchanged; Skip → next phase (Focus not counted), auto-start per toggle.
- F4 Settings: Open settings → sheet with draft values → Save (all valid: persist, close, focus returns to Open settings, announce) · Cancel / Esc / scrim / drag-down: discard draft, close, focus returns. Error: any invalid field → Save writes nothing, sheet stays, focus to first invalid field. Retry: correct value, Save again.
- F4a Allow notifications (AC25): permission `default` → Settings shows hint + "Allow notifications" → browser prompt → granted: status line G1 replaces hint + button in place · blocked: N3/N5 · dismissed: N2 + button stay (retry). Applies at once; Cancel does not undo it.
- F5 Focus mode: Enter focus mode → native fullscreen on `<html>` if `document.fullscreenEnabled` and the request resolves; else in-app overlay → Exit via Exit button, Esc, or browser UI (`fullscreenchange`) → main screen, focus returns to Enter focus mode. Timer never touched.
- F6 Return / refresh: state restored before first paint (AC18–AC21, AC23); no entry animation from 0.

## Screens
| Screen | Route | Primary action | Covers ACs |
|---|---|---|---|
| Timer (main) | `/` (single page) | Start / Pause / Resume | AC1–AC10, AC14–AC16, AC18–AC24 |
| Settings sheet | overlay on `/` | Save | AC11–AC13, AC15, AC24–AC26 |
| Focus view | native fullscreen or overlay on `/` | Start / Pause / Resume | AC17, E7 |

## State matrix
| Screen | Empty | Loading | Success | Validation error | System error | No permission |
|---|---|---|---|---|---|---|
| Timer (main) | Never empty: Focus 25:00 idle 0/4, track only (AC1) | None; sync restore, digits in fixed tabular box | Running / paused / idle per table below | n/a | Storage, audio, fullscreen failure: silent, timer works (E2, E6) | Notifications denied/unsupported: nothing on main screen (AC15) |
| Settings sheet | Shows saved or default values | None | Saved → closes, "Settings saved" announced | Inline error per field, Save blocked (AC12) | Storage unavailable: storage hint S1 at top; Save applies for the session (E2, AC26) | Hint N1–N5 + Allow button by permission; granted → status G1 (below) |
| Focus view | n/a | None | Same timer states as main | n/a | Fullscreen request rejected → overlay (E7) | n/a |

### Timer element states
| State | Eyebrow / tabs / accent | Ring | Digits + caption | Primary | Reset | Skip | Title |
|---|---|---|---|---|---|---|---|
| Idle, fresh phase | Phase name; tab pill; phase accent | Track only | Full duration, no caption | `Play` "Start" | `aria-disabled` 40 % (E9 no-op) | Enabled | `Pomodoro` |
| Idle, after phase end (Auto-start off, end handled ≤ 90 s late) | Next phase | Track only | Full duration; caption "<Prev phase> finished" | "Start" | `aria-disabled` | Enabled | `Pomodoro` |
| Idle, missed end: after reload, or handled > 90 s late; Auto-start ignored (AC21) | Next phase | Track only | Full duration; caption "<Prev phase> finished while you were away"; one alert | "Start" | `aria-disabled` | Enabled | `Pomodoro` |
| Running | Phase | Progress + glow, tweened per second | Remaining; no caption | `Pause` "Pause" + glow | Enabled | Enabled | `12:34 · Focus — Pomodoro` |
| Paused | Phase | Frozen exact, 60 % opacity | Frozen, 60 %; caption "Paused" | `Play` "Resume" | Enabled | Enabled | `12:34 · Focus — Pomodoro` |
| Phase change | Accent crossfade 600 ms; tab pill slides | Resets to 0, 320 ms | Next duration; counter updates | Per Auto-start | – | – | – |
- Captions clear on the next Start / Skip / Reset. Digits ≥ 100 min (`120:00`) render at 0.85× timer size to fit the ring at 360 px.
- Counter: Focus #1–#3 end → 1/4…3/4; #4 end → 4/4 shown through Long Break; Long Break end or Skip → 0/4 (AC8, AC9, E8).
- Restored running (AC19): ring drawn at current progress (`initial={false}`), still running. Restored paused (AC20): exact value. Other tab (AC23): UI updates silently on focus.
- Clock change (E1): digits clamp 00:00 … total; ring 0–100 %. Rapid clicks (E3): each click acts on the state at that moment; no visual lock; engine guards duplicate transitions.

### Settings states
| Element | State | Shows |
|---|---|---|
| Storage hint | storage unavailable (AC26) | InlineHint info, first row of sheet body above Durations: copy S1; static text, not focusable; else hidden |
| NumberField | valid | Value, hint "1–120 min" / "1–30 min" / "1–60 min" (`text.muted`) |
| NumberField | invalid (empty, 0, over max, decimal, non-digit) on blur or Save | `AlertCircle` + error replaces hint, `aria-invalid="true"`, border `status.error`; Save keeps sheet open |
| Stepper | at min / max | That stepper `aria-disabled`; value never steps out of range |
| Durations note | timer running or paused | "The current phase keeps its length. New durations apply from the next phase." (AC13) |
| Durations note | idle | Hidden; idle phase shows the saved value after Save (AC11) |
| Auto-start toggle | on (default) / off | `aria-checked` true / false; applies on Save |
| Sound toggle | on (default) / off | `Volume2` / `VolumeX`; applies on Save |
| Notification hint | permission `default`, not yet asked | InlineHint info: N1 + Allow button |
| Notification hint | `default`, asked (prompt dismissed) | InlineHint info: N2 + Allow button |
| Notification status (AC25) | `granted` (just granted, or already on when Settings opens) | Status line, no button: InlineHint info with icon `BellRing` (not `Info`), text `text.secondary` on `bg.elevated`, copy G1, same slot as the hint; static text, not focusable, no live role; independent of Sound draft |
| Notification hint | `denied` / unsupported | InlineHint warn, no button: Sound draft on → N3 / N4; off → N5 |
| Allow button (AC25) | permission `default` | Button secondary, `Bell` icon, "Allow notifications", 44 px, full width < sm, directly under the hint; click → `requestPermission()` + mark asked |
| Allow button | prompt open / result | Button `aria-disabled` while the prompt is open. Granted → G1 status line replaces hint + button in place (no layout jump beyond height change), focus to Sound switch, announce L1. Blocked → N3/N5, button removed, focus to Sound switch, announce L2. Dismissed or no prompt shown → N2 + button stay, focus stays on button |
- Hint follows the Sound toggle's draft value live. Permission is asked on the first Start ever (E5) or via the Allow button; either sets the persisted "asked" flag, so Start never asks again. Permission is browser state, not draft: Cancel does not revert it.

### Focus view states
| Mode | When | Behaviour |
|---|---|---|
| Native fullscreen | `fullscreenEnabled` and request resolves | Browser fullscreen of `<html>`; FocusView content; Esc handled by browser |
| Overlay fallback | Unsupported (iPhone Safari) or request rejected | `fixed inset-0 bg-base`, `role="dialog" aria-modal="true" aria-label="Focus mode"`, focus trap, Esc exits |
| Both | Enter | Focus moves to primary control; Exit button 100 %, dims to 60 % after 3 s without pointer move / focus |
| Both | Phase change / restore | Same as main; view stays open |

- Reduced motion (E11): per DESIGN Patterns — ring steps per second, no glow pulse, no press scale, sheet fades 120 ms, tab pill jumps, accent swaps instantly, Exit button dims without fade. Corrupt saved data (E10): defaults per field, no message. Storage unavailable (E2): only S1 in Settings, nothing on main screen.

## Layout
| Screen | Small (360 px) | Large (1280 px) |
|---|---|---|
| Timer (main) | Gutter 16; AppHeader 56 px; PhaseTabs full width 40 px (3 equal segments); gap 24; ring `min(78vw, 56vh, 320px)` ≈ 281 px; gap 16; CycleDots + "0/4"; controls row in lower third: Reset 48 · gap 16 · Primary 160×56 · gap 16 · Skip 48 (288 px); bottom padding safe-area; `100dvh`, no horizontal scroll | Column max 560 centred, stack vertically centred; ring 380 px; digits 128 px; radial accent glow 6 % behind ring |
| Timer, `short:` landscape | Ring `min(56vh, 240px)`, gaps halved, tabs kept | n/a |
| Settings sheet | Bottom sheet full width, top radius xl, drag handle (decorative; Cancel is the button alternative, 2.5.7), max 90 dvh, body scrolls, sticky footer Cancel · Save 50/50 | Centred dialog max-w 420, footer right-aligned Cancel · Save |
| Focus view | Exit top-right 16 px inset; ring + digits centred; controls row below | Same, ring + `timerFocus` digits up to 208 px |

- Tab order, main: Enter focus mode → Open settings → Reset timer → Start/Pause/Resume → Skip to next phase. Tabs, ring, digits, dots are not focusable (AC24).
- Tab order, Settings: Focus − / field / + → Short Break − / field / + → Long Break − / field / + → Auto-start switch → Sound switch → Allow notifications (only while `default`) → Cancel → Save (trap cycles). Initial focus: Focus field. Hints and status G1 are not focusable.
- Tab order, Focus view: Exit focus mode → Reset → Primary → Skip (trap in overlay mode).
- No `keydown` handlers on `document`: Space, R, S, F with focus on page body do nothing; Enter and Space on a focused button keep native activation; letters typed in a field are input (AC24).

## Components
- Reuse: AppHeader, PhaseTabs, ProgressRing, TimerDisplay, CycleDots, TimerControls, SettingsSheet, FocusView; primitives `ui/` Button, IconButton, NumberField, Toggle, InlineHint (DESIGN.md). Allow button = Button secondary; storage hint = InlineHint info; status G1 = InlineHint info, icon `BellRing`.
- Live region: one visually hidden `<div role="status" aria-live="polite">` in `App.tsx`, not a component; latest message replaces the previous; SettingsSheet reports L1/L2 and "Settings saved" through it.
- New: none. Removed: Toast.

## Copy
| Place | Text |
|---|---|
| App name / idle title | Pomodoro |
| Header buttons (aria-label + desktop `title`) | Enter focus mode · Open settings |
| Phase names (tabs, eyebrow uppercase) | Focus · Short Break · Long Break; tabs list `aria-label` "Phase" |
| Primary | Start · Pause · Resume |
| Reset / Skip aria-labels | Reset timer · Skip to next phase |
| Counter visible / aria-label | 2/4 · "2 of 4 focus sessions completed" |
| Captions | Paused · Focus finished · Short Break finished · Long Break finished · "<Phase> finished while you were away" |
| Exit (focus view) | Exit focus mode |
| Settings title / sections / buttons | Settings · Durations · Alerts · Cancel · Save |
| Field labels / unit / hints / steppers | Focus · Short Break · Long Break · min · 1–120 min · 1–30 min · 1–60 min · Decrease Focus · Increase Focus (per field) |
| Errors | Enter a whole number from 1 to 120. · …from 1 to 30. · …from 1 to 60. |
| Durations note | The current phase keeps its length. New durations apply from the next phase. |
| Cycle line (static, under durations) | 4 focus sessions, then a Long Break. |
| Toggles + helper | Auto-start next phase — "Start the next phase automatically." · Sound — "Play a chime when a phase ends." |
| S1 storage (AC26) | Settings and progress won't be saved in this browser. Changes last until you close or reload the page. |
| N1 | Get alerts while you're in other tabs. Allow notifications now, or you'll be asked when you first press Start. |
| N2 | Notifications are off. Allow them below, or in your browser's site settings. |
| N3 denied | Notifications are blocked in your browser settings. Sound alerts still work. |
| N4 unsupported | This browser doesn't support notifications. Sound alerts still work. |
| N5 denied/unsupported + Sound off | Notifications are unavailable and Sound is off. Turn on Sound to be alerted when a phase ends. |
| Allow button (AC25) / G1 granted status / L1 granted / L2 blocked | Allow notifications · "Notifications are on. You'll get an alert when a phase ends." · "Notifications allowed" · "Notifications blocked. Sound alerts still work." |
| Notification (title only, AC14) | Focus finished — Short Break next · Focus finished — Long Break next · Short Break finished — Focus next · Long Break finished — Focus next |
| Live: start / resume / pause / reset | "Focus started, 25 minutes" (`<Phase> started, <N> minutes`) · "Resumed" · "Paused at 20:00" · "Focus reset to 25:00" |
| Live: skip (this tab) / phase adopted from another tab (cause unknown, R-15) | "Skipped to Short Break" + " — started" when Auto-start on · adopted: running "Short Break started." · idle "Short Break is ready." |
| Live: phase end | "Focus finished. Short Break started." · Auto-start off: "Focus finished. Short Break is ready. Press Start to begin." · after #4: "Focus finished. 4 of 4 sessions done. Long Break started." |
| Live: missed end (AC21) | "Focus finished while you were away. Short Break is ready." |
| Live: settings | Settings saved |

## AC map
| ID | Verify on |
|---|---|
| AC1, AC2, AC3, AC4, AC5 | Element states: idle fresh · running · paused · Reset row |
| AC6, E8, E9 | Skip in F3; counter rules; Reset `aria-disabled` when fresh |
| AC7 | Ring: elapsed / total, frozen on Pause, no jump on Resume |
| AC8, AC9 | Counter rules; F1 |
| AC10 | F1 Auto-start on/off; "after phase end" row + caption |
| AC11, AC12, AC13 | Settings states; F4; errors copy; durations note |
| AC14, AC16 | Notification copy; Sound toggle; F1 |
| AC15, E5 | Notification hint N1–N5; no error on main screen; prompt on first Start or Allow button only |
| AC17, E7 | Focus view states; F5 |
| AC18, AC19, AC20, AC21, AC23, E4 | F6; restored running / paused; "missed end" row (90 s / reload rule), caption + live copy; one alert per end |
| AC22 | Layout 360 / 1280; targets ≥ 44 px |
| AC24 | Tab orders; tabs non-focusable; no document shortcuts |
| AC25 | F4a; Allow button + Notification status rows (granted → G1 visible, on grant and on open); Settings Tab order; copy N1, N2, G1, L1, L2 |
| AC26 | Storage hint row; State matrix Settings system error; copy S1 |
| E1, E3, E6, E12 | Clamp and rapid-click notes · silent when audio blocked (no UI) · Title column |
| E2, E10, E11 | Reduced-motion / storage bullet; Settings system-error cell |
