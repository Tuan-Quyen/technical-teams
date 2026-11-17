Verdict: PASS · Round 2

# pomodoro-followups — code review

> Owner: **team-code-reviewer**. PASS = no `open` blocking finding. Findings are cumulative: an ID (`R-01`…) is never reused; status open → fixed → verified (or dropped, with the reason). **Round detail** holds the latest round only.

## Findings
| ID | Severity | Where | What is wrong | Fix direction | Found | Status |
|---|---|---|---|---|---|---|
| R-01 | should-fix | `src/app.js` primary click handler (Q-01 announce) | `status` is read before dispatch. If the click lands after `endAt` (before the 250 ms tick or end timer), core now ends the phase (R-15) but the handler still announces "Paused, N minutes left." with the next phase's full duration. This overwrites the real "Focus done. Next up…" announcement and is false (nothing is paused). Narrow window, but it is the exact case R-15 added. | Announce Paused/Resumed only if `state.timer.status` after dispatch is `paused`/`running`; otherwise leave the phaseEnded announcement alone. | R1 | verified (R2) |
| R-02 | suggestion | `tests/core.test.js` R-15 test | Does not assert the once-only count after the transition: a following `tick`, a second `pause` and `restore` with the same `lastCountedEndAt` must leave `count` at 1. The code is correct (idle after transition, `lastCountedEndAt` set), so it is only an unpinned guarantee. | Add 2 asserts (tick at later time, count still 1). | R1 | verified (R2) |
| R-03 | suggestion | `tests/core.test.js` "R-09/R-15 … (see R-15 test)" | Reduced to `notEqual(status, "paused")`, which duplicates the R-15 test and has a weaker claim than its name. Harmless. | Delete or merge into the R-15 test. | R1 | verified (R2) |

## Original findings
| Original | Result |
|---|---|
| R-11 | verified: `dateKey(now) > today.date` in `reduce`; `restore` keeps `!==`; test covers back and forward. |
| R-12 | verified: `typeof` + `hasOwnProperty` in core; storage uses `indexOf` (strict, arrays and "toString" fail); test covers restore and adopt. |
| R-13 | verified: core `MAX_AHEAD_MS` and storage `MAX_REMAINING_MS` are both 181 min; rejected in `validTimer` and storage; tests in both files, including the 181 min boundary kept. |
| R-15 | verified: `pause` at or after `endAt` runs `transition(s, endAt, true)`. Focus counts once (`lastCountedEndAt` set, timer idle so later ticks are no-ops, other tab sees the guard). See R-01 for the app-side effect. |
| R-18 | verified: box checked only when `settings.notify && notificationSupport() === "granted"`. |
| Q-01 | done, except R-01. Copy "Paused, 24 minutes left." / "Resumed, …" fits DESIGN.md voice (warm, short, no exclamation). |
| Q-02 | verified: inline `data:` SVG favicon, no extra file, works on `file://`. |

Rewritten R-09 tests: the rollover test (start 23:50, pause at 00:05) still tests what it meant (rollover with a running timer, `lastCountedEndAt` kept, paused). The pause-after-endAt test now asserts the new behaviour, OK but see R-03.

## Round detail (latest round only)
- Round: R2 · 2026-11-17 · diff: working tree (no git baseline, so "no other change" is judged from the files read, not a diff) · files: src/app.js (primary handler), tests/core.test.js
- R-01 verified: handler announces only when status was not idle and the post-dispatch status is paused (from running) or running (from paused). The R-15 end-of-phase case (idle after dispatch) and idle→running Start are not announced. The phase-end announce stands.
- R-02 verified: R-15 test now ticks later and asserts count 1 and idle.
- R-03 verified: the duplicate "see R-15 test" test is gone.
- Checked: `npm test`: 70 pass, 0 fail, 0 skipped (71 minus the removed duplicate). No other change seen in the handler or tests.
- Open blocking: 0
- Needs security review: no
