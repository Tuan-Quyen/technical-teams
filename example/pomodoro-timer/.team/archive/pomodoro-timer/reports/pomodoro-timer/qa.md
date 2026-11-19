Verdict: PASS · Round 3 (milestone M3) — live-only checks not run (browser disconnected; user chose to ship): audible chime, real notification, two real tabs, native fullscreen, Focus view visuals, Inter computed, screen reader, reduced motion, AC18 hidden tab

# pomodoro-timer — QA

> Owner: **team-qa**. Findings are cumulative: an ID (`Q-01`…) is never reused; status open → fixed → verified (or dropped, with the reason). **Round detail** holds the latest round only: replace it every round.
> **Budget:** ≤ 120 lines. Cells ≤ 25 words; RTM keeps the last 2 round columns. **Round detail** ≤ 12 lines, replaced each round; verified/dropped findings collapse to one `Closed:` line of IDs.

## Test plan
- Scope in / out: whole product AC1–AC26, E1–E12. M3 new: alerts (AC14–16), Focus view (AC17, E7), Allow/hints (AC25), title (E12), live region, `inert`, Inter, cross-tab alert dedupe. Out: none.
- Risks → depth: double or missing alert (E4, cross-tab) — high — fake-timer integration with real runtime wiring; permission prompt rules (E5) — high — unit + RTL; Focus view trap/exit — medium — RTL; live-only audio/notification/fullscreen — high — not run this round.
- Levels: unit, store, RTL integration (fake timers). Live preview: M1, M2 only (browser tools disconnected in R3).
- Platforms × form factors: R1–R2 Chrome Windows 1536 px and 360 px iframe. R3 none (no browser).
- Data, environment, drivers: Vitest 5 + jsdom, stubbed `Notification`, `AudioContext`, `navigator.locks`; `npm run build` + `dist/` inspection. Missing: browser, speakers, second real tab.
- Exit criteria: every AC passes · no open in-scope blocker/critical/major · live preview clean · no skipped or weakened test

## Traceability (RTM)
| Condition | Source | Ticket | Test (file:name / preview step) | R2 (M2) | R3 (M3) |
|---|---|---|---|---|---|
| Timer core, Reset, Skip, ring, dots, auto-switch, Long Break | AC1–AC10, E8, E9 | T-2..T-6 | `App.cycle.qa.test.tsx`, `TimerScreen.test.tsx`, `timer.test.ts`; live R2 | pass | pass (regression) |
| Settings limits, all-or-nothing, running phase kept | AC11–AC13 | T-7 | `SettingsSheet.test.tsx`, `persist.test.ts`; live R2 | pass | pass (regression) |
| Sound plays once, notification "<phase> finished", next name | AC14 | T-8 | `alerts.test.ts:plays the chime once…`, `:phase names`; `App.m3.qa.test.tsx:natural end` (new) | not in M2 | pass (unit); audible chime not run |
| Denied/unsupported: sound still plays, no error, hint | AC15 | T-8 | `alerts.test.ts` (denied/default/absent), `Alerts.ui.test.tsx:denied, unsupported` | not in M2 | pass (unit); real browser not run |
| Sound off: no chime, notification still shown | AC16 | T-8 | `alerts.test.ts:Sound off` | not in M2 | pass (unit) |
| Fullscreen / Focus view: ring, time, controls; Esc/Exit; timer unaffected | AC17 | T-9 | `FocusView.test.tsx` (modal, Tab wrap, Exit, Esc, native, refused), `useFullscreen.test.tsx` | not in M2 | pass (unit); native fullscreen, visuals not run |
| Hidden tab 10 min: display = wall clock | AC18 | T-5 | `runtime.test.ts` (visibility, timeout) | not run live | **not run live** (user gave no manual result) |
| Refresh restore running / paused | AC19, AC20 | T-4 | `persist.test.ts`; live R2 | pass | pass (regression) |
| Ended while closed: next idle, caption, one alert, no catch-up | AC21 | T-4, T-8 | `persist.test.ts:overdue`; `App.m3.qa.test.tsx:reload overdue` (new): 1 notification, 0 chime, caption, Start | pass (state) | pass (unit) |
| Responsive, dark, ≥ 44 px, no h-scroll | AC22 | T-1, T-6 | live R2 360 iframe + 1536; `FocusView.test.tsx` 96–208 px digits | pass | pass (R2); Focus view 360 / 1280 not run |
| Two tabs: last write wins; one alert across tabs; S-04 | AC23 | T-5, T-8 | `runtime.test.ts:263`; `alerts.test.ts:of two tabs…` (fake Web Locks); live R2 storage sync | pass | pass (unit); two real tabs not run |
| Tab order, Enter/Space, no global keys, tabs inert | AC24 | T-6..T-9 | `FocusView.test.tsx:Tab order, no keydown`, `App.polish.test.tsx:Space/R/S/F`, `SettingsSheet.test.tsx` | pass | pass (unit) |
| Allow button only while `default`; granted → G1; blocked/dismissed paths | AC25 | T-8 | `Alerts.ui.test.tsx:default asked…`, `:granted`, `:blocked`, `:dismissed`, `:second click` | not in M2 | pass (unit) |
| Storage hint when unavailable | AC26 | T-7 | `SettingsSheet.test.tsx:282`; live R2 | pass | pass (regression) |
| Clock change clamped; storage corrupt; rapid clicks | E1, E2, E3, E10 | T-2, T-4 | `timer.test.ts`, `persistence.test.ts`, `App.qa.test.tsx` | pass | pass (regression) |
| Phase end as tab regains focus: once only | E4 | T-5, T-8 | `runtime.test.ts`; `App.m3.qa.test.tsx` (visibility + focus event at end: 2 oscillators = 1 chime, 1 notification) | partial | pass (unit) |
| Permission asked on first Start, not on load | E5 | T-8 | `Alerts.ui.test.tsx:does not ask on load`, `:asks once on the first Start`, `:never asks again` | not in M2 | pass (unit) |
| Autoplay blocked: silent fail | E6 | T-8 | `alerts.test.ts:audio never armed`, `:no AudioContext`; `chime.ts` guards | not in M2 | pass (unit); real autoplay policy not run |
| Fullscreen unsupported → overlay | E7 | T-9 | `FocusView.test.tsx:refused request`, `fullscreen.test.ts:unsupported` | not in M2 | pass (unit) |
| Reduced motion | E11 | T-6, T-10 | `index.css.test.ts:snaps under reduced motion`, `ProgressRing.reduced.test.tsx` | unit only | pass (unit); live not run |
| Title `MM:SS · Phase — Pomodoro`, idle `Pomodoro` | E12 | T-10 | `App.polish.test.tsx:title`; `App.m3.qa.test.tsx` | not in M2 | pass |
| One live region; announcements; R-13 `inert`; R-15 copy | T-10 | T-10 | `App.polish.test.tsx`, `App.inert.test.tsx`, `announcement.test.ts` | not in M2 | pass (unit); screen reader not run |
| Inter self-hosted, swap, fallback | T-10 | T-10 | `index.css.test.ts:self-hosts Inter`; `dist/assets/InterVariable-*.woff2` + `@font-face … woff2` in built CSS | not in M2 | pass (build); computed font not run |

## Findings
| ID | Title | Severity | Owner | Found | Status |
|---|---|---|---|---|---|
| Q-01 | `npm run lint` exits 1: `README.md` fails `prettier --check` | major | writer / developer | R3 | verified |

Closed: Q-01 (README.md, CHANGELOG.md reformatted; `npm run lint` exit 0)

## Round detail (latest round only)
- Round: R3 · 2026-11-19 · build: working tree
- Suite: `npm test` 25 files / 350 pass (347 + 3 new in `src/App.m3.qa.test.tsx`); `npm run build` exit 0 (woff2 352 kB emitted, referenced in CSS); `npx tsc -b` and `npx eslint .` exit 0.
- Q-01 retest: `npm run lint` exit 0, `npm test` 25 files / 350 pass, `npm run build` exit 0 → verified fixed.
- Env: missing `node_modules/.bin` came from devops running `npm ci` in parallel; I ran `npm install` to restore it. Not an app defect.
- Not run — browser tools disconnected; user chose to ship without them: audible chime, real notification, two real tabs giving one alert, native fullscreen and Esc, Focus view visuals 360 / 1280, Inter computed font, screen-reader announcements with a dialog open, reduced motion live, AC18 hidden tab (also not run in R2; no manual result reported), true 360 px viewport, touch.
- Accepted limitations, not findings: Start in tab A only + tab B completes → notification, no sound; no Web Locks → double chime possible; after reload an away end gives notification + caption, no chime.
- Review items R-13 (inert), R-14 (exit before resolve), R-15 (neutral copy) have unit tests that pass; R-16 nit untouched.
- Whole product: AC1–AC26 and E1–E12 pass at unit / integration level; AC1–AC13, AC19–AC24, AC26 also live in R1–R2. No finding open; PASS with the live-only gaps above accepted by the user.
- Open in-scope blocker + critical + major: 0
