# pomodoro-timer — requirements

Status: confirmed

> **Budget:** ≤ 150 lines per item. ACs as table rows with concrete values; answered questions move into ACs or facts, then leave **Open questions**.

## Goal
- A focus worker runs Pomodoro cycles in a browser with an accurate timer that survives tab switch, background and refresh, and alerts them at each phase end (G-1, G-2, G-3).

## Out of scope
- Tasks / to-do lists, statistics or history, accounts, backend, sync, any module beyond Timer Core.
- Per-device or cross-device sync; multiple timers.
- Phase colour themes beyond the single Premium Dark theme; volume control and multiple sounds; configurable cycle length.
- Manual phase selection: phase tabs (Focus / Short Break / Long Break) are display only, not clickable to switch; Skip is the only way to move on (POMO-D1).
- Keyboard shortcuts (Space, R, S, F, etc.): none (POMO-D2).

## User stories
- S1 — As a user, I want Focus 25 / Short Break 5 / Long Break 15 so that I follow the Pomodoro technique.
- S2 — As a user, I want Start, Pause, Resume, Reset and Skip so that I control the timer.
- S3 — As a user, I want an animated SVG progress ring so that I see remaining time at a glance.
- S4 — As a user, I want sessions counted in a 4-session cycle so that I know when a Long Break comes.
- S5 — As a user, I want phases to switch automatically so that I do not babysit the timer.
- S6 — As a user, I want to customise phase durations so that the timer fits my rhythm.
- S7 — As a user, I want sound and browser notifications at phase end so that I notice it while in another tab.
- S8 — As a user, I want a Fullscreen Focus Mode so that nothing distracts me.
- S9 — As a user, I want the timer accurate in background tabs and restored after refresh so that I can trust it.
- S10 — As a mobile or desktop user, I want a responsive Premium Dark UI so that it looks and works on any screen.

## Acceptance criteria
Q1–Q5 answered by the user (2026-11-19): Q1 A, Q2 B, Q3 A, Q4 A, Q5 A. Listed assumptions accepted (C). Q-S1, Q-S2 and the away rule answered 2026-11-19 (POMO-AC25, POMO-AC26, POMO-AC10/POMO-AC21).

| ID | Story | Given | When | Then |
|---|---|---|---|---|
| POMO-AC1 | S1 | Fresh load, no saved state | Page opens | Phase Focus, display 25:00, state idle, counter 0 of 4 |
| POMO-AC2 | S2 | Idle Focus 25:00 | Click Start | Countdown runs; display 24:59 after 1 s; Start replaced by Pause |
| POMO-AC3 | S2 | Running at 20:00 | Click Pause | Display freezes at 20:00 for any wait; Resume shown |
| POMO-AC4 | S2 | Paused at 20:00 | Click Resume, wait 5 s | Display 19:55 (paused time not deducted) |
| POMO-AC5 | S2 | Running or paused at 12:00 in Focus 25 | Click Reset | Current phase back to 25:00, idle; cycle counter unchanged (Q1 = A) |
| POMO-AC6 | S2 | Focus #2 running | Click Skip | Moves to Short Break 5:00; skipped Focus is NOT counted (Q1 = A); Short Break auto-starts if Auto-start is on, else waits idle (Q2) |
| POMO-AC7 | S3 | Running Focus 25:00, 6:15 elapsed | Observe ring | Ring shows 25% elapsed (progress = elapsed / total), animates smoothly, no jump on Pause/Resume |
| POMO-AC8 | S4 | Focus #1–#3 completed | Each Focus ends | Counter 1/4, 2/4, 3/4; break after each is Short 5:00 |
| POMO-AC9 | S4 | Focus #4 ends | Phase ends | Counter 4/4; next phase Long Break 15:00; after Long Break counter resets to 0/4, phase Focus |
| POMO-AC10 | S5 | Running Focus at 00:01 | Reaches 00:00 | Next phase loaded immediately; starts counting automatically when Settings Auto-start is on (default on); when off, loads it idle and waits for Start (Q2 = B). Away rule: if the end is handled more than 90 s after the scheduled end (sleep, long throttling) or after a page reload, the next phase waits idle with one alert regardless of Auto-start (POMO-AC21, BR-9) |
| POMO-AC11 | S6 | Settings open | Set Focus 50, Short 10, Long 20, save | Idle phases show those values; saved values survive refresh |
| POMO-AC12 | S6 | Settings open | Enter Focus 0 or 121 or empty | Rejected with inline message; previous value kept. Limits (integers): Focus 1–120, Short 1–30, Long 1–60 min; cycle fixed at 4 (Q3 = A) |
| POMO-AC13 | S6 | Focus running at 10:00 | Change Focus duration to 30 | Running phase is unaffected; new value applies from the next Focus (A) |
| POMO-AC14 | S7 | Sound on, permission granted | Any phase ends | The single built-in sound plays once and a notification shows "<phase> finished" with next phase name |
| POMO-AC15 | S7 | Notification permission denied or unsupported | Phase ends | Sound still plays; no error shown; Settings indicates notifications are blocked |
| POMO-AC16 | S7 | Sound toggled off | Phase ends | No sound; notification still shown if permitted (Q4) |
| POMO-AC17 | S8 | Any phase | Click Fullscreen | Page enters browser fullscreen showing only ring, time, phase and controls; Esc or Exit button leaves it, timer unaffected |
| POMO-AC18 | S9 | Running, tab hidden 10 min | Return to tab | Display equals wall-clock remaining (within 1 s), not 10 min stale |
| POMO-AC19 | S9 | Running at 15:00, refresh | Page reloads | Same phase, ≈ 15:00 minus time elapsed during reload, still running; cycle counter and settings intact |
| POMO-AC20 | S9 | Paused at 15:00, refresh | Page reloads | Paused at exactly 15:00 |
| POMO-AC21 | S9 | Running Focus ended while page was closed 3 min ago, Auto-start on | Page reloads | Per Q5 = A: shown as the next phase, idle at full duration (Auto-start does not apply after a reload), one "finished" alert; no multi-phase catch-up. Same result if the device slept and the end is handled > 90 s late (away rule, POMO-AC10); ≤ 90 s late while the page stayed open → POMO-AC10 normal path |
| POMO-AC22 | S10 | Viewport 360 px and 1280 px wide | Load page | No horizontal scroll; controls reachable and ≥ 44 px touch targets at 360 px; dark theme |
| POMO-AC23 | S9 | Two tabs open | Start in tab A | Last write wins; tab B shows state on next focus (C, accepted assumption). Exception (POMO-S4): if another tab clears the saved data (key removed, new value null), this tab ignores it, keeps its running timer and cycle, and re-saves on its next change |
| POMO-AC24 | S10 | Any screen, no shortcuts exist (POMO-D2) | Tab through the page; press Enter on each focused control | All buttons and settings controls are reachable by Tab in logical order and operable with Enter; phase tabs are not focusable controls (POMO-D1); with no control focused, pressing Space, R, S or F triggers nothing; Space on a focused button or checkbox still activates it (browser default, WCAG) |
| POMO-AC25 | S7 | Notification permission state is "default" (never asked, or first prompt dismissed without a choice) and the browser still allows asking | Open Settings, click "Allow notifications" | Browser permission prompt appears; on Allow, notifications are enabled and the button gives way to an enabled status; when state is granted, denied or unsupported the button is not offered (denied keeps the POMO-AC15 blocked indication, enable via browser site settings) |
| POMO-AC26 | S6 | LocalStorage unavailable (access throws: private mode, blocked storage) | Open Settings | One line states that settings and progress will not be saved in this browser; no other behaviour changes (POMO-E2 still holds); line absent when storage works |

## Edge cases
| ID | Case | Expected behaviour |
|---|---|---|
| POMO-E1 | System clock changed backwards or forwards while running | Remaining is clamped between 0 and the phase total; no negative time, no crash (A) |
| POMO-E2 | LocalStorage unavailable, full or corrupt JSON | App starts with defaults, no crash; timer works for the session (A) |
| POMO-E3 | Rapid double-click Start/Pause/Skip | One action applied per click; no duplicate phase transitions or double sound |
| POMO-E4 | Phase ends exactly as tab regains focus | Transition and alert happen once only |
| POMO-E5 | Notification permission not yet asked | Requested on the first Start click, never on load (Q4 = A) |
| POMO-E6 | Browser blocks audio autoplay | Sound is armed by the Start click; if still blocked, fail silently |
| POMO-E7 | Fullscreen API unsupported (e.g. iPhone Safari) | Fullscreen button falls back to in-app focus view or is hidden (C) |
| POMO-E8 | Skip during Long Break | Moves to Focus, counter 0/4 |
| POMO-E9 | Skip or Reset while idle | Skip advances phase; Reset on a fresh phase is a no-op |
| POMO-E10 | Invalid saved settings (e.g. Focus = -5) | Invalid fields fall back to defaults |
| POMO-E11 | Reduced-motion OS setting | Ring and transitions animate minimally (C) |
| POMO-E12 | Document title | Shows remaining time and phase while running (C) |

## Facts and assumptions
| Fact | Basis (C / E / A) | Source |
|---|---|---|
| Defaults Focus 25, Short 5, Long 15 min | C | BRIEF.md:14 |
| Controls: Start, Pause, Resume, Reset, Skip | C | BRIEF.md:14 |
| Cycle of 4 sessions; auto phase switching; custom durations | C | BRIEF.md:14 |
| Sound + Browser Notifications + Fullscreen Focus Mode | C | BRIEF.md:14 |
| Timestamp-based accuracy; background-stable; restore after refresh | C | BRIEF.md:17 |
| Premium Dark, responsive desktop and mobile | C | BRIEF.md:14 |
| Stack: React, TS strict, Vite, Tailwind, Zustand, Framer Motion, Lucide, LocalStorage | C | BRIEF.md:13 |
| Timer Core only, no other modules | C | BRIEF.md:17 |
| Long Break follows the 4th Focus; Short Break after the others | C | user, accepted assumption 2026-11-19 |
| UI language is English (labels) | C | user, accepted assumption |
| Evergreen browsers (latest Chrome, Edge, Firefox, Safari) | C | user, accepted assumption |
| Single theme (dark only), no light toggle | C | user, accepted assumption |
| Accuracy threshold < 1 s drift | C | user, accepted assumption |
| Reset affects only the current phase; Skip Focus is not counted as a session (Q1) | C | user 2026-11-19 |
| Next phase auto-starts; Settings has an Auto-start toggle, default on at first launch (Q2) | C | user 2026-11-19 |
| Phase tabs are display only (no manual phase selection); no keyboard shortcuts; buttons operable via Tab/Enter (POMO-D1, POMO-D2) | C | user 2026-11-19 |
| Limits Focus 1–120, Short 1–30, Long 1–60 min, integers; cycle fixed at 4 (Q3) | C | user 2026-11-19 |
| One built-in short sound, sound on/off toggle, notification permission asked on first Start (Q4) | C | user 2026-11-19 |
| Phase ended while page closed or device asleep: show next phase idle at full duration, alert once, no catch-up (Q5) | C | user 2026-11-19 |
| Settings has an "Allow notifications" button while permission can still be asked (Q-S1) | C | user 2026-11-19 |
| Settings shows a one-line "not saved in this browser" hint when LocalStorage is unavailable (Q-S2) | C | user 2026-11-19 |
| Away rule: phase end handled > 90 s late or after a reload → next phase idle with one alert, else Auto-start applies | C (rule); A (90 s margin is the architect's estimate, not verified against browsers) | user 2026-11-19; system-design `AWAY_MS` |
| Saved data cleared from another tab (key removed) while this tab runs: ignore the event, keep running timer and cycle, re-save on next change; real writes still sync (POMO-AC23) (POMO-S4) | C | user 2026-11-19; security.md POMO-S4 |
| Hint shows only when storage is unavailable; corrupt JSON alone (POMO-E2, POMO-E10) does not trigger it | A | ba, not asked |
| Mid-run duration change applies from the next phase of that type; two tabs last-write-wins; fullscreen fallback; title shows remaining time; reduced-motion respected | C | user, accepted assumptions |

## Open questions
none — Q1–Q5 answered by the user on 2026-11-19; folded into ACs and facts.


