# Team state

> Owner: **team-lead** only. Open work only — a closed item's row is removed and its files go to `.team/archive/<slug>/`.
> This file is the resume point: a new or resumed session reads it first and continues at **Next step**.

## Active work

| Slug | Pipeline | Step | Agent | Ticket | Files in use | Status | Next step |
|---|---|---|---|---|---|---|---|
| bg-color | feature | 1 — Requirements (finalize) ∥ 2 — Frontend design | team-ba ∥ team-designer | – | ba: requirements/bg-color.md · designer: frontend-design/bg-color.md, DESIGN.md | running | 3 — System design (architect), then user OK |

## Waiting on the user

| Slug | Question | Asked |
|---|---|---|

## Decisions (user, 2026-11-17)

M1–M4 approved. D1 tab title always "<Phase> - mm:ss" · D2 skip from focus → short break, not counted · D3 no banner for a break that ended while closed · D4 4-session cycle resets at local midnight · Q1 no progress ring · Q2 no shortcuts · Q3 dark mode follows OS, no toggle.

- Scope (session 2026-11-17): finish M3 only; skip M4 (T-12), CI, release check; R-11/R-12/R-13/R-15/Q-01 stay open as known issues (T-13 not built). The premature archive of system-design + reports was moved back to `system-design/` and `reports/pomodoro/` because the item is still open; `requirements/pomodoro.md` is lost, PRODUCT.md is the baseline.
- Closed 2026-11-17: M1–M3 done, files in `archive/pomodoro/`; follow-ups T-12 (optional), T-13, T-14 in TASKS.md.
- M3 approved (user, 2026-11-17). R-16: banner clears when the next phase starts. R-11/R-12/R-13/R-15 → new ticket T-13 (core); Q-01 + R-16 → T-11. pm to register T-13 in TASKS.md at close.

- friendly-design closed 2026-11-17 (files in `archive/friendly-design/`). Q-copy closed: keep AC1/AC13/AC20 wording (user delegated to lead, 2026-11-17).

- pomodoro-followups closed 2026-11-17: T-13, T-14 done (files in `archive/pomodoro-followups/`). BR-4 earlier-date rule left as assumption (user: example project, no need to confirm).

- bg-color: user accepted BA defaults Q1–Q5 ("ok", 2026-11-17): Warm/Sage/Sky with light+dark values, apply on Save, missing field → Warm, live two-tab sync.

## Counters

- Next ADR number: 0002
