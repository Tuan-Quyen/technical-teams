Verdict: PASS · Round 3 (POMO-M3)

# pomodoro-timer — code review

> Owner: **team-code-reviewer**. PASS = no `open` blocking finding. Findings are cumulative: an ID (`POMO-R1`…) is never reused; status open → fixed → verified (or dropped, with the reason). **Round detail** holds the latest round only.
> **Budget:** ≤ 80 lines. Cells ≤ 25 words. **Round detail** ≤ 8 lines, replaced each round; verified/dropped findings collapse to one `Closed:` line of IDs.

## Findings
| ID | Severity | Where | What is wrong | Fix direction | Found | Status |
|---|---|---|---|---|---|---|
| POMO-R13 | suggestion (non-blocking) | `src/App.tsx:62`, `FocusView.tsx:53`, `SettingsSheet.tsx:143` | The one live region sits outside both `aria-modal` dialogs. Start/Pause/Skip in Focus view and L1/L2 in Settings may be muted by some screen readers (support varies). | Cheap: `inert` on the page wrapper while a dialog is open (also covers the page behind Focus view); keep the region outside it. Check with QA live. | R3 | open |
| POMO-R14 | suggestion (non-blocking) | `src/hooks/useFullscreen.ts:33-36` | `fullscreen.exit()` is called inside a `setMode` updater: an impure updater (StrictMode runs it twice; harmless only because `exit` is idempotent). The "closed before the browser answered" path has no test. | Track mode in a ref and branch outside the updater; add a test: enter, exit before the request resolves, then resolve → `exitFullscreen` called. | R3 | open |
| POMO-R15 | suggestion (non-blocking) | `src/domain/format.ts:73`, `src/App.tsx:29-33` | A phase change adopted from another tab (`storage` rehydrate: new `phaseId`, no new `lastEnd`) reads "Skipped to Short Break" even after a natural end. | Reword the fallback to a neutral "Now Short Break", or mark the in-tab skip explicitly. | R3 | open |
| POMO-R16 | nit (non-blocking) | `src/index.css.test.ts:5`, `src/components/TimerDisplay.tsx:9` | The CSS test reads `'src/index.css'` relative to cwd, so it fails if vitest runs from another directory. The doc comment shows a garbled character ("96�208"). | `new URL('./index.css', import.meta.url)`; re-save the comment as UTF-8 or use "96–208" in ASCII. | R3 | open |

Closed: POMO-R1–POMO-R8 (verified R2); POMO-R9, POMO-R10, POMO-R11, POMO-R12 (verified R3)

Credits: `claim` is small and total (`ran` guard, locks absent / throw / reject all fall back once); `notify.requestPermission` never rejects and handles the callback-only Safari form; service layering is clean (domain `format` → services → components, `alerts` reads the store only for `soundOn`); tests are meaningful (fake `LockManager` shared by two "tabs", real tab-order and focus assertions); no `any`, suppressions or skipped tests.

## Round detail (latest round only)
- Round: R3 · 2026-11-19 · POMO-M3 (POMO-T8..POMO-T10) + post-PASS fixes · working tree, no base commit · all `src/**` read.
- Checks: NOT RUN by me — my role allows only `git diff/log/show` read commands. Lead/developer to supply `npm run build`, `npm run lint`, `npm test` (reported 341/341, 22 files); PASS assumes they are green.
- Verified: POMO-R9 `runtime.ts:59` clamps to 2^31-1, `persistence.ts:125` rejects `endAt` > duration + slack, tests `runtime.test.ts:299`, `persistence.test.ts:181`. POMO-R10 `SettingsSheet.tsx:145` + trap `useFocusTrap.ts:40`, test `SettingsSheet.test.tsx:165`. POMO-R12 test `:152`. POMO-R11 `alerts.ts:17-42` matches the design § Cross-tab alerts (key, `ifAvailable`, 10 s hold, sound only if `ready()`, fallback `run()`); `alerts.test.ts:201-264`.
- Points: (1) ok: ask only in `TimerControls.tsx:39` and Settings click; `start()` precedes it; the flag is not read on load. (2) ok, dedupe `alerts.ts:48`, lock released after the hold. (3) ok: text only from `PHASE_LABEL`, tag only a number. (4) works; see POMO-R14. (5) acceptable, covered by trap + `aria-modal`; `inert` is the cheap upgrade (POMO-R13). (6) POMO-R13. (7) ok: "1 minute" is correct grammar and ticks return `null`. (8) POMO-R16. (9) ok: no document `keydown` (`FocusView.test.tsx:128`).
- Open blocking: 0 · Needs security review: yes, in parallel (permission, notification text, font asset).
