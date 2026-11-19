Verdict: PASS · Round 2

# pomodoro-timer — security

> Owner: **team-security**. PASS = no `open` blocking finding. Findings are cumulative: an ID (`S-01`…) is never reused; status open → fixed → verified (or dropped, with the reason). Never write secret values.
> **Budget:** ≤ 80 lines. Cells ≤ 25 words. **Round detail** ≤ 8 lines, replaced each round; verified/dropped findings collapse to one `Closed:` line of IDs.

## Scope
- In scope: whole working tree (uncommitted, all untracked) — R1 fixes in `src/store/persistence.ts`, `src/app/runtime.ts` (+ tests); M3 (T-8…T-10): `src/services/{notify,chime,alerts,fullscreen}.ts`, `src/main.tsx`, `src/components/{TimerControls,SettingsSheet,FocusView,AppHeader}.tsx`, `src/hooks/{useFullscreen,useDocumentTitle}.ts`, `src/domain/format.ts`, `src/App.tsx`, `src/index.css`, `src/assets/fonts/*`, `package.json`, `package-lock.json`, `index.html`.
- Trust boundaries: (1) `localStorage` key → `parsePersisted`; (2) cross-tab `storage` event → `rehydrate()` (`runtime.ts:87-93`); (3) Settings fields → `saveSettings`; (4) new: Web Locks `pomodoro-timer:<kind>:<phaseId>` shared by every same-origin tab (`alerts.ts:31`); (5) new: browser permission/gesture APIs — Notification, Web Audio, Fullscreen. No network, auth, secrets or personal data.
- Scanners: `npm audit` → 0 vulnerabilities; `npm audit --omit=dev` → 0 vulnerabilities; lockfile: 300 packages, 0 outside registry.npmjs.org, only install script `fsevents` — same as R1, no dependency added in M3; `vitest run src/store src/app src/services` → 11 files, 170 tests pass; sink grep (`innerHTML`, `eval`, `new Function`, `window.open`, `fetch(`, `postMessage`, `location.`, `http(s)://`) in `src` → none.
- Font: `InterVariable.woff2` 352,240 bytes, SHA-256 `693b77d4…29a8e3`, header `wOF2`; `OFL.txt` SHA-256 `262481e8…4935a` — both match the brief; served via `src/index.css:6` relative `url()` (same origin, Vite asset).
- Skipped: `gitleaks`, `osv-scanner` not installed → not run. Re-fetch of the rsms/inter v4.1 release asset for an independent hash compare → not run (hashes checked against the lead's recorded values only). No live browser test of Notification/Fullscreen/Web Locks (reasoned from code).

## Findings
| ID | Severity | Where | Class | Attack scenario | Fix direction | Found | Status |
|---|---|---|---|---|---|---|---|
| S-01 | should-fix (non-blocking) | `src/store/persistence.ts:121,125`, `src/app/runtime.ts:59` | input validation / DoS (timer storm) | Tampered running `endAt` ≥ now+2^31 ms overflowed `setTimeout`, re-arming every ~4 ms. | Done: `durationMs` ≤ 120 min, `endAt − now ≤ durationMs + 60 s`, delay clamped to 2^31−1; tests `persistence.test.ts:170-210`, `runtime.test.ts:298-310`. | R1 | verified |
| S-02 | suggestion | `src/store/persistence.ts:121` | input validation | Huge `durationMs`/`remainingMs` broke the clock layout. | Covered by S-01 cap; test `persistence.test.ts:196`. | R1 | verified |
| S-03 | suggestion | `src/store/persistence.ts:128` | input validation | `phaseId` ≥ 2^53 made transitions no-ops, suppressing alerts. | Done: `Number.isSafeInteger(phaseId)`, ≥ 0. | R1 | verified |
| S-04 | suggestion | `src/app/runtime.ts:90` | integrity (cross-tab) | `removeItem`/`clear()` elsewhere reset this tab's running timer. | Done per user decision "Keep running": `newValue === null` ignored (`clear()` has `key === null`, filtered at :88); test `runtime.test.ts:257`. | R1 | verified |
| S-05 | suggestion (non-blocking) | deploy (no config yet) | config / headers | Shared origin lets sibling apps read/write the key and hold the alert locks; no CSP limits future injected script. | Unchanged from R1: own HTTPS origin; CSP `default-src 'self'; font-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`, `nosniff`, `no-referrer`, `Permissions-Policy … fullscreen=(self)`. Verify motion/Tailwind under strict `style-src`. | R1 | open |

Closed: S-01, S-02, S-03, S-04 (verified R2)

Checked and clean (no finding):
- R1 M3 advice followed: `requestPermission()` only in click handlers (`TimerControls.tsx:36-42`, `SettingsSheet.tsx:71-76`); stored `notifyAsked` (`=== true`, `persistence.ts:151`) can only suppress the Start-time ask, never trigger one; Settings button rendered only while `perm === 'default'`.
- Notification text: `notificationTitleFor` uses `PHASE_LABEL[end.ended/next]` only (`format.ts:36-38`); `tag` built from a validated safe integer (`notify.ts:35`); no `body`/`icon`/URL.
- `document.title` / live region: `titleFor`, `captionFor`, `announcementFor` interpolate enum labels via `PHASE_LABEL`, `formatClock` of bounded numbers and `CYCLE`; set via `document.title` and React text — no HTML sink, no raw stored string reaches them.
- Web Locks: a hostile same-origin tab could pre-hold `pomodoro-timer:<kind>:<n>` to silence alerts, or call `new Notification` itself — but it can already rewrite/clear the key and is fully trusted by the origin model; no new capability. Flood bounded: one claim per kind per phase end, deduped by `lastAlertedPhaseId` (`alerts.ts:48`) and `tag`.
- Fullscreen: `requestFullscreen` reached synchronously inside the click (`useFullscreen.ts:28-30` → `fullscreen.ts:23`); exit paths: Exit button (`FocusView.tsx:62-65`), Esc via focus trap, browser Esc → `fullscreenchange` closes view; late grant after close exits again (`useFullscreen.ts:34`).
- Web Audio: `AudioContext` created/resumed only in `chime.arm()` from the Start/Resume click (`TimerControls.tsx:38`); chime synthesized (no media file, no network).
- Font self-hosted, OFL licence shipped beside it; `index.html` loads only `/src/main.tsx`.

## Round detail (latest round only)
- Round: R2 · 2026-11-19 · delta since R1 (R1 fixes + M3 T-8…T-10)
- S-01…S-04 fixes match the advised direction and are unit-tested; S-04 behaviour follows the user's "Keep running" decision.
- M3 adds no network path, no HTML sink and no dependency; every permission/gesture API is called from a click only.
- Residual: S-05 is deploy-time; revisit when hosting config exists (Notification and Web Locks need a secure context).
- Open blocking: 0
