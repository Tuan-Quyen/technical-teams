Verdict: PASS · Round 1

# pomodoro-followups — QA

> Owner: **team-qa**. Findings are cumulative: an ID (`Q-01`…) is never reused; status open → fixed → verified (or dropped, with the reason). **Round detail** holds the latest round only: replace it every round.

## Test plan
- Scope in / out: T-13 (R-11, R-12, R-13, R-15) and T-14 (Q-01, Q-02, R-18) plus regression of start/pause/reset/skip, tab title, settings dialog. Out: M4 Playwright, CI, real hidden-tab throttling, dark mode.
- Risks → depth: R-15 pause after endAt (high, state transition, fake clock) · R-11 rollover direction (medium, boundary: earlier/later date) · R-13 remainingMs bound (medium, boundary 181 min, 181 min + 1 ms) · Q-01 live-region text (medium) · R-18 permission states (medium, decision table: denied/default/granted × stored notify true).
- Levels: unit (`npm test`) · live preview (Chromium, file://).
- Platforms × form factors: Chromium (Chrome for Testing 1254) desktop viewport; 375 / dark already covered in the archived pomodoro round, untouched by this change.
- Data, environment, drivers: playwright-core in the session scratchpad (`scratchpad/fu.js`), `page.clock` for time, seeded localStorage keys `pomodoro:v1:*`, `Notification.permission` overridden by init script. Not in package.json.
- Exit criteria: every AC passes · no open in-scope blocker/critical/major · live preview clean · no skipped or weakened test

## Traceability (RTM)
| Condition | Source | Ticket | Test (file:name / preview step) | R1 | R2 |
|---|---|---|---|---|---|
| Earlier-date clock does not reset today's count; later date does | R-11 | T-13 | unit (core.test.js) + live: count 3, clock to 11-16, Start → still 3, stored 3; clock to 11-18 → 0 | pass | |
| Non-string / inherited phase (`toString`) rejected | R-12 | T-13 | unit (core + storage) + live: stored phase "toString" → idle Focus 25:00 | pass | |
| Paused remainingMs above 181 min rejected, 181 min kept | R-13 | T-13 | unit (core + storage) + live: 9e9, 181 min + 1 ms, negative, string → defaults; 181:00 kept | pass | |
| Pause at/after endAt ends the phase, counts once, announces phase end | R-15 | T-13 | unit + live: start, `setSystemTime` +26 min, click Pause → "Focus done. Next up: short break, 5 minutes…", count 1, idle Short break; ticks and reload keep 1 | pass | |
| Pause / Resume update live region; Start from idle is not "Resumed" | Q-01 | T-14 | live: Start → "" ; Pause → "Paused, 25 minutes left."; Resume → "Resumed, 25 minutes left." | pass | |
| Favicon present, no `/favicon.ico` request | Q-02 | T-14 | live: 0 non-file/data requests; `link[rel=icon]` data SVG decodes (naturalWidth > 0) | pass | |
| Notify box unchecked unless permission is granted | R-18 | T-14 | live: stored notify true + denied → unchecked; default → unchecked; granted → checked | pass | |
| Regression: start/pause/reset/skip, title "<Phase> - mm:ss", dialog save/cancel | M1–M3 | – | live: Reset → Start; Skip → "Short break - 05:00", count 0; cancel keeps 25, save 30 persisted | pass | |
| 0 console errors | all | – | console/pageerror listeners over every scenario | pass | |

## Findings
| ID | Title | Severity | Owner | Found | Status |
|---|---|---|---|---|---|
| none | – | – | – | – | – |

## Round detail (latest round only)
- Round: R1 · 2026-11-17 · build working tree (nothing committed)
- Suite: `npm test` → 70 tests, 70 pass, 0 fail, 0 skipped (the reviewer cites 71; I counted 70 in the TAP summary, no skip or failure either way).
- Live preview: Chromium via playwright-core on `file://index.html`, 33 checks, 33 pass, console errors/warnings 0, non-file network requests 0. Script: `/private/tmp/claude-502/-Users-ctquyen-Documents-project-self-project-core-technical-teams-example-pomodoro/75e91a9f-8bc7-45bc-ae64-54b821310e6d/scratchpad/fu.js`.
- New or reopened findings: none. Code-reviewer R-01 (Paused announced after endAt) does not reproduce on the current build: `app.js` compares status after dispatch and the live check shows only the phase-end text, no "Paused". The reviewer owns that finding's status.
- Not run: real sleep/wake or hidden-tab throttling (only simulated with `setSystemTime`), a real notification permission prompt (permission overridden by init script), Safari/Firefox. No tests added (no gap found).
- Open in-scope blocker + critical + major: 0
