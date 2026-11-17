Verdict: PASS · Round 1

# friendly-design — QA

> Owner: **team-qa**. Findings are cumulative: an ID (`Q-01`…) is never reused; status open → fixed → verified (or dropped, with the reason). **Round detail** holds the latest round only: replace it every round.

## Test plan
- Scope in / out: in — visual and copy refresh (palette, type, spacing, buttons, dialog, banner, copy), light and dark, behaviour unchanged. Out — new features, core logic (covered by the unit suite), notifications and sound on a real OS.
- Risks → depth: AA contrast in both themes (high — measured from computed tokens); keyboard focus visible (high — checked on every control); behaviour regression from copy edits in `app.js` (medium — smoke of every action and `npm test`); file:// and offline (medium — network log); layout at 375 px (medium — scroll and screenshot).
- Levels: unit (existing suite) · live preview (Chromium via playwright-core, file://).
- Platforms × form factors: Chromium, light and dark (`prefers-color-scheme`) × 375 and 1280 px. Not run: Safari, Firefox, a real phone, forced-colors.
- Data, environment, drivers: playwright-core installed in the scratchpad (not in the project), cached Chromium 1254; localStorage seeded to show the "Focus finished" banner; `Notification` stubbed as denied for the warning banner.
- Exit criteria: every AC passes · no open in-scope blocker/critical/major · live preview clean · no skipped or weakened test

## Traceability (RTM)
| Condition | Source | Ticket | Test (file:name / preview step) | R1 | R2 |
|---|---|---|---|---|---|
| Softer palette, rounder type, more whitespace | Expected behaviour 1 | – | Screenshots light/dark × 375/1280 (idle, running, short break, dialog, banner) | pass | |
| Light text and accent contrast ≥ 4.5:1 | Expected 1 (AA) | – | Computed tokens: text 13.2–14.9, muted 5.27–5.97, accent on pill 5.43–6.00, accent on tint 4.80–5.29, on-accent on accent 5.43–6.00, error 6.57 | pass | |
| Dark text and accent contrast ≥ 4.5:1 | Expected 1 (AA) | – | Text 12.9–15.2, muted 6.71–7.91, accent on pill 7.84–8.96, accent on tint 7.75–8.41, on-accent 8.67–9.91, error 9.42 | pass | |
| Non-text contrast ≥ 3:1 (control border, focus ring) | Expected 1 (WCAG 1.4.11) | – | Border on surface 3.76 light / 4.43 dark; on tint ≥ 3.32 / 4.15; focus ring ≥ 12.9 | pass | |
| Buttons: rounded, primary vs secondary vs ghost clear | Expected 2 | – | Screenshots; primary filled, secondary outlined, ghost text | pass | |
| Visible keyboard focus on every button | Expected 2 | – | Tab through settings, Start, Reset, Skip, Got it; dialog fields, checkbox, Cancel, Save: all 3px solid, ring colour contrasts, in both themes and sizes | pass | |
| Settings dialog open / validate / save / cancel | Expected 3 (no flow change) | – | Open ok; "abc" → "Enter a whole number from 1 to 180", stays open, red border; valid value + Save closes; Cancel closes and discards | pass | |
| Banner "Got it" and warning banner | Expected 3 | – | Seeded expired focus → "Focus finished at hh:mm", Got it hides; denied notify → warning text with red border, dismisses; dismiss button reachable by Tab | pass | |
| Start / Pause / Resume / Reset / Skip unchanged | Expected 3 | – | Start → "Pause", Pause → "Resume" + "Paused" note, Skip focus → short break, count not incremented, Reset → "Start" | pass | |
| Tab title "<Phase> - mm:ss" | Expected 3 | – | "Focus - 25:00" → "Focus - 24:59" → "Short break - 05:00" | pass | |
| No new deps, works from file://, no network | Expected 3 | – | 0 non-file requests, 0 console or page errors in 8 runs; package.json untouched | pass | |
| `npm test` green | Expected 4 | – | `npm test` | pass | |
| No horizontal scroll at 375 px | Layout | – | `scrollWidth <= innerWidth` in all 4 combos | pass | |
| Q-copy wording of AC1/AC13/AC20 | Expected 5 | – | Kept as is (default) | pass pending user decision | |

## Findings
| ID | Title | Severity | Owner | Found | Status |
|---|---|---|---|---|---|
| – | none | – | – | – | – |

## Round detail (latest round only)
- Round: R1 · 2026-11-17 · build working tree (folder untracked, no commit)
- Suite: `npm test` → 66 pass, 0 fail, 0 skipped
- Live preview: Chromium, file://, light and dark × 375 and 1280 px → ok, console and page errors 0 of 8 runs, network requests 0. Screenshots read: dark 375 banner, light 1280 dialog with error. Scripts and screenshots are in the session scratchpad only.
- New or reopened findings: none. Observations (no ID, no action needed):
  - The dialog Save button and checkbox use the Focus accent even while the page is in a break phase (the dialog sits outside `#app`; code review R-01 covers the fallback tokens). Cosmetic and by design.
  - Disabled-control text is 4.09 light / 4.18 dark on its background. WCAG exempts disabled controls, so it is not a failure.
  - Not run: a real notification and a sound at phase end (a browser permission prompt), 25-minute full cycle, Safari and Firefox, forced-colors.
- Open in-scope blocker + critical + major: 0
