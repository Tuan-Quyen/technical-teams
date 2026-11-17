Verdict: PASS · Round 2 (M3)

# pomodoro — QA

> Owner: **team-qa**. Findings are cumulative: an ID (`Q-01`…) is never reused; status open → fixed → verified (or dropped, with the reason). **Round detail** holds the latest round only: replace it every round.

## Test plan
- Scope in / out: R1 M2 (T-4..T-8) and R2 M3 (T-9, T-10, T-11): AC10, AC11, AC12–AC14, E2, E3, E5, E8, R-16, with M1/M2 as regression. Out (known, not failed): R-11, R-12, R-13, R-15, R-18, Q-01, M4 Playwright, CI, real hidden-tab throttling over 5 min, dark mode AC23.
- Risks → depth: double beep or double count with two tabs (high: state transitions); permission path and blocked audio must never throw (high: error guessing); settings validation boundaries 0/1/180/181/blank/1.5 (high: boundary values); running phase must not change on save (medium).
- Levels: unit (core, storage: 66 tests) and live preview of the real page over http.
- Platforms × form factors: desktop headless Chrome (new headless) over `http://127.0.0.1:8765` (python http.server, stopped). No phone width check.
- Data, environment, drivers: Node 22 CDP scripts (no installs) in the scratchpad: `Date.now` shim to jump the clock, AudioContext wrapper counting oscillators, Notification stub (default to granted / denied) plus the real headless Notification, AudioContext variants for E3, two real tabs on one profile for E5. Scripts and profiles are outside the repo.
- Exit criteria: every AC passes · no open in-scope blocker/critical/major · live preview clean · no skipped or weakened test

## Traceability (RTM)
| Condition | Source | Ticket | Test (file:name / preview step) | R1 | R2 |
|---|---|---|---|---|---|
| Focus end counts, goes to Short break 05:00 | AC6 | T-4 | core.test.js::AC6; preview: cycle step 1 | pass | pass (regression; unit 66/66, live smoke) |
| 4th focus gives Long break 15:00 | AC7 | T-4 | core.test.js::AC7; preview: 4-focus cycle | pass | pass (regression; unit 66/66, live smoke) |
| Break end gives Focus idle | AC8 | T-4 | core.test.js::AC8; preview: after each break | pass | pass (regression; unit 66/66, live smoke) |
| Skip from focus (idle/running) gives Short break, not counted | AC9 | T-7 | core.test.js::AC9; preview skip idle + running focus | pass | pass (regression; unit 66/66, live smoke) |
| Skip from break gives Focus idle | AC9b | T-7 | core.test.js::AC9b; preview skip running break | pass | pass (regression; unit 66/66, live smoke) |
| Skipped long break, next focus makes 5 and short break | AC9c | T-4 | core.test.js::AC9c; preview seeded count 4 | pass | pass (regression; unit 66/66, live smoke) |
| Settings and count restored, idle Focus | AC16 | T-5/T-8 | core.test.js::AC16; preview seeded 30/10/20 count 2 | pass | pass (regression; unit 66/66, live smoke) |
| Count from earlier date shows 0 | AC17 | T-4/T-8 | core.test.js::AC17/E7; preview seeded 2000-01-01 | pass | pass (regression; unit 66/66, live smoke) |
| Running timer resumes after reload, counts down | AC18, E1 | T-5/T-8 | core.test.js::AC18; preview reload at +10 min: 14:59 then 14:57 | pass | pass (regression; unit 66/66, live smoke) |
| Paused timer survives reload 1 h later | AC19 | T-5/T-8 | core.test.js::AC19; preview reload at +70 min: same time, Resume continues | pass | pass (regression; unit 66/66, live smoke) |
| Focus ended while closed: count, Short break, banner, no sound | AC20 | T-5/T-8 | core.test.js::AC20; preview +40 min: "Focus finished at 11:59" = stored end time; dismiss; reload does not recount | pass | pass (regression; unit 66/66, live smoke) |
| Break ended while closed: Focus idle, no banner | AC21, D3 | T-5/T-8 | core.test.js::AC21; preview +30 min | pass | pass (regression; unit 66/66, live smoke) |
| One transition only, no chaining | AC21 | T-5 | core.test.js::one transition; preview +10 h: Short break idle, count 1 | pass | pass (regression; unit 66/66, live smoke) |
| Corrupt or missing timer: idle Focus, no error | AC22 | T-5/T-6 | core.test.js::AC22; storage.test.js::invalid timer shapes; preview: garbage, wrong shape, wrong version, array, far future | pass | pass (regression; unit 66/66, live smoke) |
| Corrupt settings and today fall back alone | AC22 | T-5 | core.test.js::invalid settings or today; preview | pass | pass (regression; unit 66/66, live smoke) |
| Sleep/throttle: catch-up from system clock, ends once | E4 | T-7 | preview: visibilitychange after 60 s shows 24:00; after 30 min ends once, count 1 | pass | pass (regression; unit 66/66, live smoke) |
| Background 60 s shows real elapsed time | AC5 | T-7 | preview (above), 25:00 to 24:00 | pass | pass (regression; unit 66/66, live smoke) |
| localStorage unavailable: works in memory, no crash | E6 | T-6 | storage.test.js::throwing backend, default backend ...; preview: methods throw, accessor throws, localStorage null | pass | pass (regression; unit 66/66, live smoke) |
| Focus ending after midnight counts for new date | E7 | T-4 | core.test.js::E7; preview at 23:50 local, stored date 2026-11-18 count 1 | pass | pass (regression; unit 66/66, live smoke) |
| Tab title "<Phase> - mm:ss" in every state | AC10b | T-7 | core.test.js::R-05; preview titles in all states | pass | pass (regression; unit 66/66, live smoke) |
| M1 regression: initial 25:00, start, pause/resume, reset | AC1–AC4 | M1 | core.test.js::AC1..AC4; preview AC1, AC2, AC19 | pass | pass (regression; unit 66/66, live smoke) |
| One short sound at live phase end | AC10 | T-9/T-11 | live: 1 min focus, clock +61.5 s: oscillator and start count 1, still 1 after 1.5 s; break end gives 2nd beep | | pass |
| Tab title "<Phase> - mm:ss" after phase end | AC10 | T-11 | live: "Short break - 03:00", then "Focus - 01:00" | | pass |
| Live-region message at phase end | AC10 | T-11 | live: "Focus finished. Short break, 3 minutes. Press Start when ready." | | pass |
| Sound unlocked by Start | E3 | T-9/T-11 | live: AudioContext created on first Start | | pass |
| Opt-in desktop notification at live phase end | AC11 | T-9/T-11 | live, Notification stub granted: one `Pomodoro` / "Focus finished. Short break is ready." at focus end, one at break end | | pass |
| No notification when opt-in is off, or phase ended while closed | AC11, AC20 | T-11 | live: granted but off gives 0 calls; reload +5 min gives 0 calls and 0 sounds | | pass |
| Permission asked only on checkbox change | AC11, E2 | T-10 | live: request count 0 after load, open dialog, save; 1 after the click | | pass |
| Permission denied: checkbox back off, warning banner, sound and title still alert, banner clears on next Start | E2 | T-10 | live, stub default to denied; real headless Chrome (default) also ends off + warning | | pass |
| Sound blocked or no audio: no error, phase still ends | E3 | T-9 | live, 3 variants: no AudioContext, constructor throws, resume rejects with failing oscillator; title, count right, console 0 | | pass |
| Validation "Enter a whole number from 1 to 180" | AC12, E8 | T-10 | live: rejected 0, 181, blank, 1.5, abc, -1, space, 1e1, 010x (dialog stays open, aria-invalid, focus on field); accepted 1 and 180; core.test.js::validateDuration | | pass |
| Save applies from next phase; running phase unchanged | AC13, AC14 | T-10 | live: running 25:00 focus, save focus=1, clock stays 25:00; focus ends; Short break uses new 3 min; next focus is 01:00; settings survive reload | | pass |
| Cancel discards, reopen shows saved values, no stale error | AC12 | T-10 | live | | pass |
| Two tabs: second tab adopts running timer | E5 | T-11 | live: A Start, B shows Pause and counting within 1 s | | pass |
| Two tabs: phase counted once, silent adopt | E5 | T-11 | live: A ends (beep 1, count 1); B shows idle Short break, count 1, 0 sounds; B clock past old end keeps count 1. Both tabs past end at once: count 1 on both, one beep in total | | pass |
| Banner "Focus finished at HH:MM" for end while closed, clears on next Start | AC20, R-16 | T-5/T-11 | live: reload +2 min: banner "Focus finished at 13:07", no sound, count 1; Start hides it | | pass |
| Page works on file:// | live | – | title "Focus - 25:00", clock 25:00, 0 errors in this headless run (developer saw an empty DOM; not reproduced) | | info |
| No console errors or exceptions | live | all | CDP Runtime/Log listeners across whole run | pass | pass (0 errors; only a favicon 404, see Q-02) |

## Findings
| ID | Title | Severity | Owner | Found | Status |
|---|---|---|---|---|---|
| Q-01 | Spoken restore message is stale after Pause/Resume. After reload the live region keeps "Focus running, 15 minutes left" while the timer is paused (the next announcement only comes at a phase change). Screen-reader users get no confirmation of Pause/Resume. Not an AC; a11y note | minor | developer | R1 | open |
| Q-02 | The page declares no favicon, so the browser requests `/favicon.ico` and gets a 404 (a red line in the DevTools console over http). Not an app error; cosmetic. Add `<link rel="icon" href="data:,">` or a real icon | suggestion | developer | R2 | open |

## Round detail (latest round only)
- Round: R2 (M3: T-9, T-10, T-11) · 2026-11-17 · build working tree (nothing committed)
- Suite: `npm test` → 66 tests, 66 pass, 0 fail. No new test: `app.js` and `alerts.js` are browser code with no unit harness (accepted by the reviewer); the gap is closed by the live run below, not by a test file. Nothing under `tests/` changed.
- Live preview: headless Chrome new headless, served over http (`127.0.0.1:8765`, stopped), 63 checks in 3 scripts, all pass. One check failed twice because of my own expectation, not the app: (1) closed-end count assumed 1 but the profile already held 1 from the earlier scenario; re-run on a clean profile shows "Today: 1 session". (2) Tab B was asserted to show "00:5x" 600 ms after A started; it showed "01:00" because the remaining time is 60.0 s (ceil), with Pause already showing and counting down at 1 s. Both counted as pass.
- Console: 0 exceptions, 0 console errors/warnings. Only the favicon 404 from the python server (Q-02) on pages 1 and 2 of scenario A.
- Not driven or not possible: the audible tone (only that one oscillator is created and started, no error); the real browser permission prompt (headless auto-resolves; the denied and granted paths were driven through a Notification stub, and the real `default` path ended off + warning); real OS notification display; real hidden-tab throttling (tabs forced active and not throttled; time moved with a `Date.now` shim); real sleep. file://: this run showed a normal page (title, clock, 0 errors), so the empty DOM the developer saw is not reproduced; http is the supported way anyway.
- Observation, no ID: two tabs reaching the end in the same millisecond is the accepted design risk. In my run only one tab beeped (A 0, B 1) and the count stayed 1 on both.
- New or reopened findings: Q-02 (suggestion, above). Q-01 stays open (a11y note, not M3). R-18 (stale checked box when permission is later revoked) is known and was not failed.
- Open in-scope blocker + critical + major: 0
