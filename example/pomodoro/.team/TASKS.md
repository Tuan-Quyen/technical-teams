# Tasks

> Owner: **team-pm** — tickets and status. Everyone else reads it. Status: todo · doing · blocked · review · done.
> Tickets that run in parallel must have disjoint `Files`.

## pomodoro — Pomodoro timer (static web page, no build)

Source: `.team/archive/pomodoro/system-design/pomodoro.md` (steps 1-6), `.team/frontend-design/DESIGN.md`. `requirements/pomodoro.md` was lost; `.team/PRODUCT.md` is the baseline. Core, app.js and tests are split across milestones to get a walking skeleton first; the contracts in the design are unchanged.

### M1 — Walking skeleton (25:00 Focus, Start/Pause/Resume/Reset work in the browser)

| Ticket | Summary | Owner | Files | Depends on | Size | ACs | Status |
|---|---|---|---|---|---|---|---|
| T-1 | `package.json` (`test` = `node --test "tests/**/*.test.js"`, no `"type": "module"`) and minimal core: `initialState`, `reduce` for start / pause / resume / reset, `remainingMs`, `formatClock` (ceil), `phaseName`, `dateKey`, namespace + CommonJS guard. Unit tests with injected `nowMs`, `TZ=UTC` | developer | `package.json`, `src/core.js`, `tests/core.test.js` | – | M | AC1, AC2, AC3, AC4 | done |
| T-2 | Page shell and styles: all hooks from the design (`data-phase`, `role="timer"`, one primary button, Reset, Skip, count, live region, banner slot, Settings button, `<dialog>` form), script tags in fixed order, all DESIGN.md tokens, dark mode, reduced motion | developer | `index.html`, `styles.css` | – | M | AC1, AC15 (static) | done |
| T-3 | Minimal `app.js`: boot with `initialState`, render, handlers for Start / Pause / Resume / Reset, 250 ms render interval. No storage, no alerts. Must not crash while `storage.js` / `alerts.js` do not exist yet (T-2 keeps those script tags out until T-6 / T-9 land, or app.js guards on `Pomodoro.storage` / `Pomodoro.alerts`) | developer | `src/app.js` | T-1, T-2 | S | AC1, AC2, AC3, AC4, AC5 (time from `endAt`) | done |

Parallel groups: T-1 ∥ T-2; T-3 after both.
Done when: opening `index.html` shows 25:00 Focus; Start counts down, Pause holds, Resume continues, Reset returns to 25:00.

### M2 — Full cycle and persistence (reload resume)

| Ticket | Summary | Owner | Files | Depends on | Size | ACs | Status |
|---|---|---|---|---|---|---|---|
| T-4 | Core cycle: `tick` + `transition` (count, short/long rule, break to focus, `lastCountedEndAt` guard), `skip`, `saveSettings`, `dismissNotice`, `validateDuration`, `titleFor`, midnight rollover in `reduce`, `phaseEnded` / `persist` effects. Unit tests incl. boundaries 1 / 180 / 0 / 181 | developer | `src/core.js`, `tests/core.test.js` | T-1 | M | AC6, AC7, AC8, AC9, AC12, AC13, AC14, AC17, E7, E8 | done |
| T-5 | Core restore: `restore` (all rows of the reload table, per-part validation, invalid-data rules, one transition only, `notice` for finished focus) and `adopt`. Unit tests | developer | `src/core.js`, `tests/core.test.js` | T-4 | M | AC16, AC18, AC19, AC20, AC21, AC22, E1, E4, E5 (guard) | done |
| T-6 | Storage: `createStorage(backend?)`, three `pomodoro:v1:` keys, validation to `null`, memory fallback when `localStorage` throws, write only changed keys, `isPersistent`. Unit tests on fake and throwing backends | developer | `src/storage.js`, `tests/storage.test.js` | – (contract in design) | M | AC16, AC22, E6 | done |
| T-7 | App cycle wiring: handle `tick` and `phaseEnded` (next phase idle, Start waits), Skip, "Today: N sessions", one-shot `setTimeout` at `endAt` (cleared on pause / reset / skip), `visibilitychange` → tick + render, local-midnight rollover shown without reload | developer | `src/app.js` | T-3, T-4 | M | AC5, AC6, AC7, AC8, AC9, AC15, AC17, E4, E7 | done |
| T-8 | App persistence: boot `storage.load` → `core.restore` → render before first paint, save on every `persist` effect, banner "Focus finished at hh:mm" with dismiss, live-region restore message, in-memory fallback without error | developer | `src/app.js` | T-5, T-6, T-7 | M | AC16, AC18, AC19, AC20, AC21, AC22, E1, E6 | done |

Parallel groups: T-4 ∥ T-6 (T-5 after T-4 on the same `core.js`; T-7 after T-4 and T-3; T-8 last).
Done when: a focus session ends into the right break, count and Skip work, and a reload resumes running, paused, ended-while-closed and corrupt-data cases correctly.

### M3 — Alerts, settings and two tabs

| Ticket | Summary | Owner | Files | Depends on | Size | ACs | Status |
|---|---|---|---|---|---|---|---|
| T-9 | Alerts adapter: `unlockAudio`, `beep` (oscillator, under 3 s, no loop), `setTitle`, `notificationSupport`, `requestNotificationPermission`, `notify` (errors swallowed) | developer | `src/alerts.js` | – (contract in design) | S | AC10, AC11, E2, E3 | done |
| T-10 | App settings dialog: open / Cancel / Save, three numeric text fields with inline "Enter a whole number from 1 to 180", notification checkbox (permission requested on change only, reverts to off and shows warning when not granted), running phase unchanged on save | developer | `src/app.js`, `index.html` | T-8, T-9 | M | AC12, AC13, AC14, E2, E8 | done |
| T-11 | App alerts and two tabs: on live `phaseEnded` call `beep`, `notify`, live-region message; `unlockAudio` on Start / Resume; tab title from `titleFor` on every render; no alert on `live:false`; `storage` event → `adopt`, re-arm timer, no sound; adopt before own phase end | developer | `src/app.js` | T-10 | M | AC10, AC11, E3, E5 | done |

Parallel groups: T-9 can start with T-4 / T-6 (disjoint files); T-10 → T-11 sequential on `app.js`.
Done when: phase end plays one sound, updates the tab title and optionally notifies; settings validate and apply from the next phase; two tabs count a session once.

### M4 — Browser tests (optional)

| Ticket | Summary | Owner | Files | Depends on | Size | ACs | Status |
|---|---|---|---|---|---|---|---|
| T-12 | Playwright with `page.clock`: start and countdown, background elapsed time, phase-end title, reload resume (running, paused, ended), corrupt storage. Adds the only devDependency and the `e2e` script | developer | `e2e/pomodoro.spec.js`, `playwright.config.js`, `package.json` | T-11 | M | AC2, AC5, AC10, AC18, AC19, AC20, AC21, AC22 | todo (not planned for the example) |

Parallel groups: none (last).

### Follow-ups (known issues from review and QA)

| Ticket | Summary | Owner | Files | Depends on | Size | ACs | Status |
|---|---|---|---|---|---|---|---|
| T-13 | Core hardening: R-11 roll over only when `dateKey(nowMs) > today.date` (keep `!==` in `restore`); R-12 `phase` check with `typeof` + `hasOwnProperty`; R-13 reject `remainingMs > MAX_AHEAD_MS` in core and storage; R-15 `pause` after `endAt` runs `transition` first. Add a test per fix | developer | `src/core.js`, `src/storage.js`, `tests/core.test.js` | – | S | none new (hardening) | done — review PASS round 2 (R-01..R-03 fixed, 0 open); QA PASS round 1 (33/33 live checks from file://, 0 console errors); `npm test` 70 pass / 0 fail; reports: `.team/archive/pomodoro-followups/reports/` |
| T-14 | Minor UI findings: Q-01, Q-02 (QA report) and R-18 (open Settings with the notify box unchecked when permission is not `granted`) | developer | `src/app.js`, `index.html` | – | S | none new | done — review PASS round 2 (R-01..R-03 fixed, 0 open); QA PASS round 1 (33/33 live checks from file://, 0 console errors); `npm test` 70 pass / 0 fail; reports: `.team/archive/pomodoro-followups/reports/` |

Parallel groups: T-13 ∥ T-14 (disjoint files).

### Overall parallel plan
- Wave 1: T-1 ∥ T-2 ∥ T-6 ∥ T-9 (disjoint files; T-6 and T-9 only need the design contract)
- Wave 2: T-3 (after T-1, T-2) ∥ T-4 (after T-1)
- Wave 3: T-5 (after T-4, edits `core.js`) ∥ T-7 (after T-3 and T-4, edits `app.js`): disjoint files.
- Wave 4: T-8, then T-10, T-11, then optional T-12 (all touch `app.js` or depend on it, so sequential).

<!-- Notes for the lead: (1) The design's step 5 (app.js) is split into T-3, T-7, T-8, T-10, T-11 so M1 ships early; core.js is split into T-1, T-4, T-5. Same files, no contract change. (2) Open design assumptions are not ticketed and need the user or designer: skip from focus always goes to short break; no banner when a break ends while closed; title always "<Phase> - mm:ss" (conflicts with DESIGN.md "Tab title" for idle); long-break cycle uses today's count (resets after midnight). (3) T-10 also touches `index.html` for dialog fixes; it never runs in parallel with T-2. -->
