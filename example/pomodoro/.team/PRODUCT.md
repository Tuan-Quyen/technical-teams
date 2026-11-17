# Product

> Owner: **team-ba**. The current truth of the product. When an item closes, what its requirements established is merged here. Short; delete rows that are no longer true.
> Basis: **C** confirmed by the user · **E** evidenced (file:line, doc) · **A** assumption.

## Vision
A simple Pomodoro timer for individuals who want to work in focused intervals separated by breaks. It works instantly in a browser, with no account and no setup. (Basis: C for platform and scope, user answers 2026-11-17)

## Users
| Role | Goal |
|---|---|
| Focus worker (student, developer, writer) | Run timed focus and break intervals and see how many focus sessions were completed today |

## Goals
| ID | Goal | Measure | Basis |
|---|---|---|---|
| G-1 | A user can start a focus session within one click of opening the app | Start button visible on first load, 1 click to run | A |
| G-2 | The user is told when a phase ends even if the tab is in the background | Sound plays and tab title changes at 00:00 | A |
| G-3 | The user sees today's progress | Count of completed focus sessions for the current local date | A |
| G-4 | An accidental reload does not lose a running timer | After reload the remaining time (or next phase) is correct within 1 s | C |

## Context
- Other systems: none (no backend, no accounts, no integrations)
- Constraints: single-page web app, no backend, no accounts, browser storage only (C, user 2026-11-17); stack and deadline unknown

## Capabilities
| Capability | Status (live / building / planned) | Requirements |
|---|---|---|
| Timer with focus / short break / long break cycle | planned | `requirements/pomodoro.md` |
| Settings for durations | planned | `requirements/pomodoro.md` |
| Timer survives reload (stored end timestamp) | planned | `requirements/pomodoro.md` |
| End-of-phase alert and daily count | planned | `requirements/pomodoro.md` |

## Business rules
| ID | Rule | Example | Basis |
|---|---|---|---|
| BR-1 | Default durations: focus 25 min, short break 5 min, long break 15 min, user-editable | Fresh install shows 25:00 | C (user, 2026-11-17) |
| BR-2 | A long break follows a completed focus session when today's count is a multiple of 4; otherwise a short break. Skipping a focus always leads to a short break | Count 4 after a finished focus: 15 min break; skipped focus: 5 min break | C (user, 2026-11-17) |
| BR-3 | Only a focus session that runs to 00:00 counts as completed; a reset or skip does not | Reset at 10:00 remaining: count unchanged | C for skip (user), A for reset |
| BR-4 | The daily count and the 4-session cycle reset at local midnight, i.e. only when the local date moves forward; a clock or timezone change to an earlier date keeps the count | Count 5 on Mon 23:59, 0 on Tue 00:00; clock set back to Sun: still 5 | C for midnight (user, 2026-11-17); A for the earlier-date case (pending user) |
| BR-7 | Tab title is always "<Phase> - mm:ss"; colour scheme follows the OS; no progress ring, no keyboard shortcuts | "Short break - 05:00" | C (user, 2026-11-17) |
| BR-5 | After a phase ends, the next phase waits for the user to click Start | Focus ends, break shows 05:00 idle | C (user, 2026-11-17) |
| BR-6 | A running timer is restored after reload from its stored end timestamp; if it ended while closed, the next phase is shown idle (one transition only) | Focus ended 15 min ago: break idle at 05:00 | C for resume, A for the details |
| BR-8 | Pressing Pause after the phase has already ended finishes that phase (focus counts once, next phase shown idle, phase-end announcement); it never pauses at 0:00 | Pause 1 min after 00:00 of focus: count +1, break idle at 05:00 | E (QA report pomodoro-followups, R-15) |
| BR-9 | A stored paused timer above 181 min or with an invalid phase is discarded on load and defaults are shown | Stored 182 min paused: idle Focus 25:00 | E (QA report pomodoro-followups, R-12, R-13) |
| BR-10 | Settings shows the notification box checked only when the browser permission is granted; Pause and Resume are announced to screen readers ("Paused, 25 minutes left." / "Resumed, 25 minutes left."), Start from idle is not | Permission denied or default: box unchecked | E (QA report pomodoro-followups, R-18, Q-01) |

## Glossary
| Term | Meaning |
|---|---|
| Pomodoro / focus session | One timed work interval (default 25 min) |
| Short / long break | Rest interval after a focus session (default 5 / 15 min) |
| Cycle | 4 focus sessions with their breaks, ending in a long break |

## Backlog
| # | Opportunity | Option | Serves | Value | Size | Status |
|---|---|---|---|---|---|---|
| 1 | Link sessions to tasks | Optional one-line label per session | G-3 | medium (A) | S | idea |
| 2 | History and statistics over days | Per-day counts chart | G-3 | medium (A) | M | idea |
| 3 | Sync across devices | Accounts and backend | G-3 | low (A) | L | idea |
| 4 | Ambient or ticking sounds | Sound picker | G-2 | low (A) | S | idea |
