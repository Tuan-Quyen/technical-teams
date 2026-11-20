# Product

> Owner: **team-ba**. The current truth of the product. When an item closes, what its requirements established is merged here. Short; delete rows that are no longer true.
> Basis: **C** confirmed by the user · **E** evidenced (file:line, doc) · **A** assumption.
> **Budget:** ≤ 150 lines. One row per rule; no history.

## Vision
- People who need to concentrate lose track of time and rest; Pomodoro Timer is a single-page web timer that runs the Pomodoro technique (focus / break cycles) accurately and without friction.
- Premium dark look, works on desktop and mobile, keeps its state across refresh, tab switch and background.

## Users
| Role | Goal |
|---|---|
| Focus worker (student, developer, anyone using the Pomodoro technique) | Run focus and break phases with minimal effort, trust the clock, get alerted at phase end |

## Goals
Status as of v0.1.0 (QA PASS round 3; live-only checks were not run, user chose to ship).

| ID | Goal | Measure | Basis | Status |
|---|---|---|---|---|
| G-1 | Timer is accurate | Displayed remaining time drifts < 1 s from wall clock after 25 min, including a hidden tab | C (threshold accepted by the user) | Timestamp logic covered by automated tests; hidden-tab drift **not verified in a real browser** (AC18) |
| G-2 | No lost session | After refresh the phase, remaining time, running/paused state, cycle counter and settings are restored | C | Met: automated tests and live preview (running and paused refresh) |
| G-3 | User notices phase end even without looking | Sound and/or browser notification fires at phase end | C | Automated tests only; audible chime and real notification **not verified live** |
| G-4 | Smooth, fast UI | Usable at 360 px and 1280 px width; animations do not block the timer | A (measure is ours) | Main screen verified live at 360 and 1536 px; Focus view at 360 / 1280 not verified |

## Context
- Other systems: none; no backend, no accounts, data stays in the browser (LocalStorage key `pomodoro-timer`).
- Constraints: stack fixed by the user (React, TypeScript strict, Vite, Tailwind CSS, Zustand, Framer Motion, Lucide React); modern evergreen browsers (latest Chrome, Edge, Firefox, Safari) (C); desktop and mobile layouts; English UI; single dark theme, no light toggle (C).
- Delivery: GitHub Actions runs install, lint, tests and build; Inter font self-hosted (SIL OFL 1.1).
- Not verified in a real browser (automated tests only): hidden-tab accuracy, audible chime, real notifications, two real tabs, native fullscreen, Focus view visuals, screen readers, reduced motion, strict `style-src 'self'`.
- Known limitations (v0.1.0):
  - Start pressed only in tab A and tab B finishes the phase first: no sound (notification still shows).
  - Browsers without Web Locks may play the chime twice with two tabs open.
  - After a reload, audio is re-armed by the first pointerdown, keydown or touchend anywhere on the page; until then, phase ends are silent (notification and caption still show). No UI hint tells the user (C).
  - The 90 s away margin is an estimate.

## Capabilities
| Capability | Status (live / building / planned) | Requirements |
|---|---|---|
| Pomodoro Timer Core (phases, controls, progress ring, cycle count, auto-switch, settings, sound + notifications, fullscreen, persistence) | live (v0.1.0) | `.team/archive/pomodoro-timer/requirements/pomodoro-timer.md` |

## Business rules
| ID | Rule | Example | Basis |
|---|---|---|---|
| BR-1 | Three phases: Focus 25 min, Short Break 5 min, Long Break 15 min by default | Fresh load shows Focus 25:00, idle, counter 0 of 4 | C |
| BR-2 | A cycle is 4 Focus sessions; the break after the 4th Focus is Long, other breaks are Short; after the Long Break the counter resets to 0/4 and the phase is Focus | Focus #1 → Short, #2 → Short, #3 → Short, #4 → Long | C |
| BR-3 | Remaining time is derived from timestamps, never from counting ticks; paused time is not deducted; a clock change clamps remaining between 0 and the phase total | Tab hidden 10 min while running → on return remaining is 10 min less | C; clamp A |
| BR-4 | Durations of the three phases are user-editable (whole minutes) and persist; invalid input is rejected inline and the previous value kept; a running phase is unaffected, the new value applies from the next phase of that type; cycle fixed at 4 | Focus set to 50 → next Focus starts at 50:00; Focus 0 or 121 rejected | C; limits Focus 1–120, Short 1–30, Long 1–60 min; mid-run rule A accepted |
| BR-5 | Phase ends automatically switch to the next phase and it auto-starts; Settings Auto-start toggle, on by default, can turn it off (next phase then waits idle); exception: BR-9 | Focus ends → Short Break begins | C |
| BR-6 | Scope is Timer Core only: no tasks, stats, accounts, backend, sync or other modules; no per-device sync, no multiple timers | – | C |
| BR-7 | Reset affects only the current phase and keeps the cycle counter; Skip moves to the next phase (Long Break → Focus, counter 0/4); a skipped Focus is not counted as a session; Skip counts as a phase change and follows Auto-start | Skip in Focus #2 → counter unchanged; Reset on a fresh phase is a no-op | C |
| BR-8 | One built-in sound (no volume control) with on/off toggle; end-of-phase notification "<phase> finished" with the next phase name, shown if permitted even when sound is off; permission asked on the first Start, never on load; Settings "Allow notifications" button shown only while the browser can still ask; denied or unsupported → sound still plays, no error, Settings shows blocked | Sound off → notification only; prompt dismissed → button in Settings | C |
| BR-9 | Away rule: phase end handled > 90 s late (sleep, long throttling) or after a page reload → next phase idle at full duration, one alert with a "while you were away" caption, no catch-up, Auto-start ignored; otherwise Auto-start applies | Closed 3 min past end → next phase idle | C; 90 s margin A (estimate, unverified) |
| BR-10 | Phase tabs only display the current phase; Skip is the only way to change phase manually; no keyboard shortcuts; every control is reachable by Tab in logical order and operable with Enter / Space (browser default on buttons) | Tap Long Break tab → nothing happens; pressing R with nothing focused → nothing | C |
| BR-11 | Settings shows a one-line hint that settings and progress are not saved when LocalStorage is unavailable; corrupt JSON alone does not trigger it. Unavailable, full or corrupt storage → app starts with defaults, timer works for the session; invalid saved fields fall back to defaults | Private mode → hint shown | C; corrupt-JSON-no-hint A |
| BR-12 | Two tabs sync on real writes (last write wins); saved data cleared from another tab is ignored: this tab keeps its running timer and cycle and re-saves on its next change; the phase-end alert fires once across tabs | Other tab clears site data → this tab keeps counting | C |
| BR-13 | Fullscreen Focus Mode shows only ring, time, phase and controls; Esc or the Exit button leaves it and the timer is unaffected; where the Fullscreen API is unavailable an in-app overlay is used | iPhone Safari → in-app Focus view | C |
| BR-14 | While running, the tab title shows remaining time and phase; idle shows `Pomodoro`; reduced-motion OS setting makes ring and transitions animate minimally | Title `24:59 · Focus — Pomodoro` | C |
| BR-15 | Layout works at 360 px and 1280 px: no horizontal scroll, controls ≥ 44 px touch targets at 360 px; the progress ring shows elapsed / total and does not jump on Pause/Resume; blocked audio autoplay fails silently, sound is armed by the Start click, or after a reload by the first click, key or touch | 6:15 elapsed of 25:00 → ring 25% | C; ring behaviour E (live R2) |

## Glossary
| Term | Meaning |
|---|---|
| Phase | One of Focus, Short Break, Long Break |
| Session | One completed Focus phase; counted toward the cycle |
| Cycle | 4 Focus sessions plus their breaks, ending with a Long Break |
| Skip | Jump to the next phase without waiting for the timer |
| Auto-start | Setting: the next phase starts counting by itself when a phase ends |
| Away rule | BR-9: late or post-reload phase end leaves the next phase idle with one alert |
| Focus view | Fullscreen Focus Mode: native fullscreen, or an in-app overlay when unavailable |

## Backlog
| # | Opportunity | Option | Serves | Value | Size | Status |
|---|---|---|---|---|---|---|
| 1 | Close the live-verification gap: hidden-tab drift, audible chime, real notification, two real tabs, native fullscreen | Run the live checks in a real browser | G-1, G-3 | high (goals unverified live) | S | idea |
| 2 | Chime missed in the other tab / before the first gesture after reload | Revisit audio arming for the known limitations | G-3 | low (edge cases) | M | idea |
