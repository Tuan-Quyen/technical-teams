# bg-color — requirements

Status: confirmed (approved by the user, 2026-11-17: all recommended defaults for Q1-Q5 accepted)

## Goal
A focus worker who finds the default warm off-white background too bright or too plain can pick the app background from 3 preset colours in the existing Settings dialog. The choice is remembered and shared across tabs. Request (user, Vietnamese): "thêm customize màu background trong settings (chỉ cần 3 màu)".

## Out of scope
- Free colour picker, hex input, more than 3 presets, per-phase backgrounds
- A light/dark toggle (dark mode follows the OS only, Q3)
- Changing phase accents, panel tint, text, border or any other token
- Background images, gradients
- Sync across devices

## User stories
- S1 — As a focus worker, I want to choose the app background from 3 colours in Settings so that the timer page suits my taste and surroundings.
- S2 — As a returning user, I want my choice kept after reload, and my existing durations and notification setting untouched, so that nothing is lost by this feature.
- S3 — As a user with two tabs open, I want a saved background to show in the other tab too so that both tabs look the same.
- S4 — As a user who uses dark mode at night, I want every preset to have a dark version so that the page never turns bright against my OS setting.

## Acceptance criteria
Preset ids and values are in Q1. `bgColor` is the stored settings field; `P1` is the default preset.

| ID | Story | Given | When | Then |
|---|---|---|---|---|
| AC1 | S1 | Fresh install, OS in light mode | The app loads | Page background is the P1 light colour (today's `#FBF8F4`); the settings field is `bgColor = "p1"`; the page looks identical to before this feature |
| AC2 | S1 | Settings dialog is closed | The user opens Settings | A "Background" group shows exactly 3 options, each with a visible text name and a colour swatch, in a radio group with the current choice selected |
| AC3 | S1 | Dialog open, P1 selected | The user selects P2 and clicks Save | Dialog closes, the page background is the P2 colour at once, "Settings saved" is announced, `bgColor = "p2"` is stored with durations and notify unchanged |
| AC4 | S1 | Dialog open, P1 saved, user selects P3 | The user clicks Cancel or presses Esc | Page background stays P1; reopening Settings shows P1 selected (no live preview; Q3) |
| AC5 | S1 | Dialog open | The user changes the background and also enters focus "0" (invalid) and clicks Save | Existing inline error for focus shows, dialog stays open, nothing is saved, background does not change |
| AC6 | S1 | Dialog open | The user tabs to the group and uses arrow keys / Space | Options can be selected by keyboard; focus ring is visible; a screen reader reads the group name and each option name with its selected state |
| AC7 | S2 | P2 saved | The page is reloaded | The page loads straight in P2 (no flash of P1 before first paint noticeable as a change after load) |
| AC8 | S2 | Stored settings from before this feature: `{focusMin:30, shortMin:7, longMin:20, notify:true}` with no `bgColor` | The app loads | Durations 30/7/20 and notify are kept, background is P1; nothing is reset to defaults |
| AC9 | S2 | Stored `bgColor` is not one of the 3 ids (e.g. "purple", 5, null) while durations are valid | The app loads | Background is P1, durations and notify are kept |
| AC10 | S3 | Tab A and tab B open, both P1 | In tab A the user saves P2 | Tab B shows the P2 background without reload; no sound, no timer change in tab B |
| AC11 | S3 | Tab B has Settings open with P3 selected but unsaved, tab A saves P2 | The storage event reaches tab B | Page behind the dialog turns P2; the radio selection in the open dialog is left as the user has it (Q5) |
| AC12 | S4 | OS in dark mode, P2 selected | The app loads | Background is the P2 dark colour (not the P2 light colour); text and panel keep their dark-mode tokens |
| AC13 | S4 | App open with P2, OS switches from light to dark | The OS scheme changes | Background switches to the P2 dark colour without reload |
| AC14 | S4 | Each of the 3 presets, in light and dark | Contrast is measured | `--color-text` 4.5:1 or higher and `--color-text-muted` 4.5:1 or higher on the background; panel tint, surface and border stay distinguishable (border 3:1 or higher on bg); focus ring 3:1 or higher |
| AC15 | S1 | P2 selected | The phase changes focus to short break to long break | Background stays P2; only accent and tint change |
| AC16 | S2 | Storage unavailable (memory fallback) | The user saves P3 | Background is P3 for the session; no error is shown |

## Edge cases
| ID | Case | Expected behaviour |
|---|---|---|
| E1 | Old stored settings without `bgColor` (existing users) | Valid; `bgColor` defaults to P1. A missing field must not make the whole settings object invalid and reset durations (today `validSettings` and the storage validator reject on any missing or mistyped field, so they need to accept absence of `bgColor`) |
| E2 | Unknown or corrupt `bgColor` | Only that field falls back to P1; other settings kept (AC9) |
| E3 | Storage validator copies known fields only | `bgColor` must be in the storage whitelist or it is silently dropped on save and load |
| E4 | A newer-than-this-build id arrives from another tab | Ignored, P1 shown (same rule as E2) |
| E5 | Save with the same colour as before | No visible change; settings saved as usual |
| E6 | Reduced motion | No colour animation (existing global rule); with motion allowed a short cross-fade is optional, designer's call |
| E7 | Narrow phone (320 px) | The 3 options fit the dialog without horizontal scroll and keep a tap target of 44 px or more |
| E8 | Tab title, sounds, notifications | Unaffected |

## Facts and assumptions
| Fact | Basis (C / E / A) | Source |
|---|---|---|
| Exactly 3 background colours, chosen in Settings | C | User request |
| Dark mode follows the OS, no toggle | C | User, Q3; PRODUCT.md BR-7 |
| No build step, vanilla JS, localStorage | C | ADR 0001; PRODUCT.md |
| Background is today `--color-bg` `#FBF8F4` (light) / `#1A1816` (dark) | E | `styles.css:3`, `styles.css:71` |
| Settings today: focusMin, shortMin, longMin, notify; saved only on Save via `saveSettings` | E | `src/core.js:21`, `src/core.js:150` |
| `validSettings` and the storage validator require all 4 fields and drop unknown ones | E | `src/core.js:173`, `src/storage.js:23-26` |
| Other tabs adopt settings via the `storage` event, then `render()` | E | `src/app.js:144-147`, `src/app.js:319-323` |
| Dialog fields apply only on Save; Cancel discards | E | `src/app.js:257-310` |
| Panel (`--tint`), surface, text and border tokens exist separately from `--color-bg`, so only the page background needs to change | E | `styles.css:136-139`, `styles.css:181-195` |
| The 3 presets Warm (default) / Sage / Sky, each with a light and a dark value (Q1, Q2) | C | User, 2026-11-17 ("ok" to the recommended defaults) |
| The hex values for Sage and Sky and their dark variants are still candidates until the designer confirms contrast (AC14) | A | Designer, pending |
| Choice applies on Save, no live preview (Q3) | C | User, 2026-11-17 |
| Existing users without the field get P1 and keep other settings (Q4); two-tab sync leaves an open dialog's selection alone (Q5) | C | User, 2026-11-17 |

## Open questions
All five are decided by the user, 2026-11-17 ("ok": option A of each, the recommended default). Hex values in Q1 stay candidates until the designer confirms contrast (AC14); a failing value is adjusted by the designer, not re-asked.

| # | Question | Options → consequence | Default |
|---|---|---|---|
| Q1 | Which 3 colours, and is one the current default? | A: P1 "Warm" (today's `#FBF8F4` / dark `#1A1816`, the default), P2 "Sage" (light `#EEF4EF` / dark `#161C18`), P3 "Sky" (light `#EEF2F8` / dark `#161A22`) → existing users see no change, all 3 are soft neutrals that stay readable. B: 3 new colours, none the current one → existing users' page changes on upgrade, and the "no change" guarantee is lost. C: stronger colours (e.g. beige, mint, lavender) → more personality, but text and tint contrast must be rechecked and panel may blend into the bg. Hex values above are candidates; the designer confirms them against AC14 | A |
| Q2 | How does the choice interact with OS dark mode? | A: each preset has a light and a dark value, the OS picks which one shows (S4, AC12-13) → keeps Q3, 6 values to maintain. B: presets are light-only and dark mode ignores them → colour is lost for dark users, defeats the feature at night. C: picking a colour forces light or dark → breaks Q3, rejected | A |
| Q3 | Apply immediately (live preview) or on Save? | A: on Save, Cancel discards → same as the other settings, simplest, no revert logic. B: live preview as the user clicks, revert on Cancel → nicer feel but extra state and a second code path for something with 3 options the user can try in 3 clicks | A |
| Q4 | Default for existing users whose saved settings lack the field | A: P1 and keep all other settings (AC8, E1) → no visible change. B: treat as invalid and reset to defaults → wipes their durations, rejected | A |
| Q5 | Two-tab sync when Settings is open in the other tab | A: the page behind updates to the saved colour, the unsaved radio selection stays as typed (AC11) → consistent with how durations behave today (inputs untouched). B: also reset the open dialog to the saved value → surprises a user mid-edit. Sync itself (AC10) is expected and not in doubt | A |
