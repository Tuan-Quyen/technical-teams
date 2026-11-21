Verdict: PASS · Round 3 (milestone POMO-M3) — live-only checks not run (browser disconnected; user chose to ship): audible chime, real notification, two real tabs, native fullscreen, Focus view visuals, Inter computed, screen reader, reduced motion, POMO-AC18 hidden tab

# pomodoro-timer — QA

> Owner: **team-qa**. Findings are cumulative: an ID (`POMO-Q1`…) is never reused; status open → fixed → verified (or dropped, with the reason). **Round detail** holds the latest round only: replace it every round.
> **Budget:** ≤ 120 lines. Cells ≤ 25 words; RTM keeps the last 2 round columns. **Round detail** ≤ 12 lines, replaced each round; verified/dropped findings collapse to one `Closed:` line of IDs.

## Test plan
- Scope in / out: whole product POMO-AC1–POMO-AC26, POMO-E1–POMO-E12. POMO-M3 new: alerts (POMO-AC14–16), Focus view (POMO-AC17, POMO-E7), Allow/hints (POMO-AC25), title (POMO-E12), live region, `inert`, Inter, cross-tab alert dedupe. Out: none.
- Risks → depth: double or missing alert (POMO-E4, cross-tab) — high — fake-timer integration with real runtime wiring; permission prompt rules (POMO-E5) — high — unit + RTL; Focus view trap/exit — medium — RTL; live-only audio/notification/fullscreen — high — not run this round.
- Levels: unit, store, RTL integration (fake timers). Live preview: POMO-M1, POMO-M2 only (browser tools disconnected in R3).
- Platforms × form factors: R1–R2 Chrome Windows 1536 px and 360 px iframe. R3 none (no browser).
- Data, environment, drivers: Vitest 5 + jsdom, stubbed `Notification`, `AudioContext`, `navigator.locks`; `npm run build` + `dist/` inspection. Missing: browser, speakers, second real tab.
- Exit criteria: every AC passes · no open in-scope blocker/critical/major · live preview clean · no skipped or weakened test

## Traceability (RTM)
| Condition | Source | Ticket | Test (file:name / preview step) | R2 (POMO-M2) | R3 (POMO-M3) |
|---|---|---|---|---|---|
| Timer core, Reset, Skip, ring, dots, auto-switch, Long Break | POMO-AC1–POMO-AC10, POMO-E8, POMO-E9 | POMO-T2..POMO-T6 | `App.cycle.qa.test.tsx`, `TimerScreen.test.tsx`, `timer.test.ts`; live R2 | pass | pass (regression) |
| Settings limits, all-or-nothing, running phase kept | POMO-AC11–POMO-AC13 | POMO-T7 | `SettingsSheet.test.tsx`, `persist.test.ts`; live R2 | pass | pass (regression) |
| Sound plays once, notification "<phase> finished", next name | POMO-AC14 | POMO-T8 | `alerts.test.ts:plays the chime once…`, `:phase names`; `App.m3.qa.test.tsx:natural end` (new) | not in POMO-M2 | pass (unit); audible chime not run |
| Denied/unsupported: sound still plays, no error, hint | POMO-AC15 | POMO-T8 | `alerts.test.ts` (denied/default/absent), `Alerts.ui.test.tsx:denied, unsupported` | not in POMO-M2 | pass (unit); real browser not run |
| Sound off: no chime, notification still shown | POMO-AC16 | POMO-T8 | `alerts.test.ts:Sound off` | not in POMO-M2 | pass (unit) |
| Fullscreen / Focus view: ring, time, controls; Esc/Exit; timer unaffected | POMO-AC17 | POMO-T9 | `FocusView.test.tsx` (modal, Tab wrap, Exit, Esc, native, refused), `useFullscreen.test.tsx` | not in POMO-M2 | pass (unit); native fullscreen, visuals not run |
| Hidden tab 10 min: display = wall clock | POMO-AC18 | POMO-T5 | `runtime.test.ts` (visibility, timeout) | not run live | **not run live** (user gave no manual result) |
| Refresh restore running / paused | POMO-AC19, POMO-AC20 | POMO-T4 | `persist.test.ts`; live R2 | pass | pass (regression) |
| Ended while closed: next idle, caption, one alert, no catch-up | POMO-AC21 | POMO-T4, POMO-T8 | `persist.test.ts:overdue`; `App.m3.qa.test.tsx:reload overdue` (new): 1 notification, 0 chime, caption, Start | pass (state) | pass (unit) |
| Responsive, dark, ≥ 44 px, no h-scroll | POMO-AC22 | POMO-T1, POMO-T6 | live R2 360 iframe + 1536; `FocusView.test.tsx` 96–208 px digits | pass | pass (R2); Focus view 360 / 1280 not run |
| Two tabs: last write wins; one alert across tabs; POMO-S4 | POMO-AC23 | POMO-T5, POMO-T8 | `runtime.test.ts:263`; `alerts.test.ts:of two tabs…` (fake Web Locks); live R2 storage sync | pass | pass (unit); two real tabs not run |
| Tab order, Enter/Space, no global keys, tabs inert | POMO-AC24 | POMO-T6..POMO-T9 | `FocusView.test.tsx:Tab order, no keydown`, `App.polish.test.tsx:Space/R/S/F`, `SettingsSheet.test.tsx` | pass | pass (unit) |
| Allow button only while `default`; granted → G1; blocked/dismissed paths | POMO-AC25 | POMO-T8 | `Alerts.ui.test.tsx:default asked…`, `:granted`, `:blocked`, `:dismissed`, `:second click` | not in POMO-M2 | pass (unit) |
| Storage hint when unavailable | POMO-AC26 | POMO-T7 | `SettingsSheet.test.tsx:282`; live R2 | pass | pass (regression) |
| Clock change clamped; storage corrupt; rapid clicks | POMO-E1, POMO-E2, POMO-E3, POMO-E10 | POMO-T2, POMO-T4 | `timer.test.ts`, `persistence.test.ts`, `App.qa.test.tsx` | pass | pass (regression) |
| Phase end as tab regains focus: once only | POMO-E4 | POMO-T5, POMO-T8 | `runtime.test.ts`; `App.m3.qa.test.tsx` (visibility + focus event at end: 2 oscillators = 1 chime, 1 notification) | partial | pass (unit) |
| Permission asked on first Start, not on load | POMO-E5 | POMO-T8 | `Alerts.ui.test.tsx:does not ask on load`, `:asks once on the first Start`, `:never asks again` | not in POMO-M2 | pass (unit) |
| Autoplay blocked: silent fail | POMO-E6 | POMO-T8 | `alerts.test.ts:audio never armed`, `:no AudioContext`; `chime.ts` guards | not in POMO-M2 | pass (unit); real autoplay policy not run |
| Fullscreen unsupported → overlay | POMO-E7 | POMO-T9 | `FocusView.test.tsx:refused request`, `fullscreen.test.ts:unsupported` | not in POMO-M2 | pass (unit) |
| Reduced motion | POMO-E11 | POMO-T6, POMO-T10 | `index.css.test.ts:snaps under reduced motion`, `ProgressRing.reduced.test.tsx` | unit only | pass (unit); live not run |
| Title `MM:SS · Phase — Pomodoro`, idle `Pomodoro` | POMO-E12 | POMO-T10 | `App.polish.test.tsx:title`; `App.m3.qa.test.tsx` | not in POMO-M2 | pass |
| One live region; announcements; POMO-R13 `inert`; POMO-R15 copy | POMO-T10 | POMO-T10 | `App.polish.test.tsx`, `App.inert.test.tsx`, `announcement.test.ts` | not in POMO-M2 | pass (unit); screen reader not run |
| Inter self-hosted, swap, fallback | POMO-T10 | POMO-T10 | `index.css.test.ts:self-hosts Inter`; `dist/assets/InterVariable-*.woff2` + `@font-face … woff2` in built CSS | not in POMO-M2 | pass (build); computed font not run |

## Findings
| ID | Title | Severity | Owner | Found | Status |
|---|---|---|---|---|---|
| POMO-Q1 | `npm run lint` exits 1: `README.md` fails `prettier --check` | major | writer / developer | R3 | verified |

Closed: POMO-Q1 (README.md, CHANGELOG.md reformatted; `npm run lint` exit 0)

## Round detail (latest round only)
- Round: R3 · 2026-11-19 · build: working tree
- Suite: `npm test` 25 files / 350 pass (347 + 3 new in `src/App.m3.qa.test.tsx`); `npm run build` exit 0 (woff2 352 kB emitted, referenced in CSS); `npx tsc -b` and `npx eslint .` exit 0.
- POMO-Q1 retest: `npm run lint` exit 0, `npm test` 25 files / 350 pass, `npm run build` exit 0 → verified fixed.
- Env: missing `node_modules/.bin` came from devops running `npm ci` in parallel; I ran `npm install` to restore it. Not an app defect.
- Not run — browser tools disconnected; user chose to ship without them: audible chime, real notification, two real tabs giving one alert, native fullscreen and Esc, Focus view visuals 360 / 1280, Inter computed font, screen-reader announcements with a dialog open, reduced motion live, POMO-AC18 hidden tab (also not run in R2; no manual result reported), true 360 px viewport, touch.
- Accepted limitations, not findings: Start in tab A only + tab B completes → notification, no sound; no Web Locks → double chime possible; after reload an away end gives notification + caption, no chime.
- Review items POMO-R13 (inert), POMO-R14 (exit before resolve), POMO-R15 (neutral copy) have unit tests that pass; POMO-R16 nit untouched.
- Whole product: POMO-AC1–POMO-AC26 and POMO-E1–POMO-E12 pass at unit / integration level; POMO-AC1–POMO-AC13, POMO-AC19–POMO-AC24, POMO-AC26 also live in R1–R2. No finding open; PASS with the live-only gaps above accepted by the user.
- Open in-scope blocker + critical + major: 0
