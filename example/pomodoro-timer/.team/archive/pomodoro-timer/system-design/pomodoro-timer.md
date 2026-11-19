# pomodoro-timer — system design

Status: draft

> **Budget:** ≤ 200 lines per item. Decisions and contracts, not code walk-throughs — cite `file:line`. Big work → one file per milestone (`<slug>-m2.md`); a revision replaces the section, it is never appended.

## Approach
- Four layers, one direction: `components → hooks → store → domain`; `src/app/runtime.ts` (non-React) owns timers, browser events and alerts; `src/services/` wraps every browser API (ADR 0001).
- State is timestamps only: running = `endAt`; paused/idle = `remainingMs`. Ticks only re-render (BR-3). Every transition bumps `phaseId`; end handling is keyed on it so it happens once (E3, E4).
- Store is created and hydrated synchronously from `localStorage` before first render (Zustand docs: sync storage hydrates at store creation), so no loading state (DESIGN.md Patterns › Loading).
- No router, no backend, no keyboard shortcut handlers, no "set phase" action (BR-10, AC24).

## Components and files
| Area | Files | Change |
|---|---|---|
| tooling | `package.json`, `vite.config.ts` (react + `@tailwindcss/vite` + `test` block), `tsconfig*.json` (template, strict), `eslint.config.js` (hand-written, ADR 0001), `.prettierrc.json`, `.prettierignore`, `index.html` | new; scripts below |
| domain | `src/domain/types.ts`, `settings.ts` (defaults, limits, `validateMinutes`), `timer.ts` (engine), `format.ts` (`formatClock`, `titleFor`, `captionFor`, `announcementFor`, notification text) | new, pure, no imports from React/store/browser; all copy from screen spec § Copy |
| store | `src/store/persistence.ts` (safe storage, `parsePersisted`, `merge`, `migrate`), `src/store/timerStore.ts` (`createTimerStore`, `useTimerStore`) | new |
| runtime | `src/app/runtime.ts` (`startRuntime({ store?, onPhaseEnd? })`: end timeout, resync, cross-tab, `data-phase`, alert dispatch) | new |
| services | `src/services/notify.ts`, `chime.ts`, `alerts.ts`, `fullscreen.ts` | new; feature-detect + try/catch, never throw |
| hooks | `src/hooks/useNow.ts` (display tick), `useDocumentTitle.ts`, `useFullscreen.ts`, `useFocusTrap.ts` (sheet + overlay) | new |
| ui primitives | `src/components/ui/Button.tsx`, `IconButton.tsx`, `Toggle.tsx`, `NumberField.tsx`, `InlineHint.tsx` | new (DESIGN.md Components; Toast dropped by the screen spec) |
| ui features | `src/components/AppHeader.tsx`, `PhaseTabs.tsx`, `ProgressRing.tsx`, `TimerDisplay.tsx` (digits + eyebrow + caption), `CycleDots.tsx`, `TimerControls.tsx` (primary + Reset/Skip), `SettingsSheet.tsx`, `FocusView.tsx` | new; DESIGN.md paths confirmed, primitives moved to `ui/`, controls grouped in `TimerControls` |
| shell | `src/main.tsx` (create store → `restoreOnLoad` → `startRuntime` → render), `src/App.tsx` (`MotionConfig reducedMotion="user"`, layout, the one hidden `role="status"` live region), `src/index.css` (Tailwind, tokens, `@font-face`) | new |
| font | `src/assets/fonts/InterVariable.woff2` + `src/assets/fonts/OFL.txt` | new asset: official Inter variable font (OFL 1.1) from the rsms/inter release, committed; no npm dep (ADR 0001). Download source/URL unverified |
| tests | `src/test/setup.ts` (jest-dom, `localStorage.clear`, real timers reset), `*.test.ts(x)` next to source | new |

- Deps: `react`, `react-dom`, `zustand`, `motion`, `lucide-react`. Dev: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `typescript` (6.x, ADR 0001), `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` (real Tab order for AC24), `prettier`. Versions resolved at T-1: vite 8.3.8, react 19.3.1, tailwindcss + `@tailwindcss/vite` 4.3.5, zustand 5.1.0, motion 14.14.0, lucide-react 1.75.0, vitest 5.1.1, typescript 6.0.3, eslint 10.15.0, prettier 3.10.1, jsdom 29.1.1.
- Scripts: `dev` `vite` · `build` `tsc -b && vite build` · `lint` `eslint . && prettier --check .` · `format` `prettier --write .` · `test` `vitest run` · `preview` `vite preview`.

## Contracts
**Domain types** (`src/domain/types.ts`)
- `Phase = 'focus' | 'short' | 'long'`; `Status = 'idle' | 'running' | 'paused'`.
- `Settings { focusMin; shortMin; longMin: number /*int*/; autoStart: boolean; soundOn: boolean }`; defaults 25 / 5 / 15 / `true` / `true`; limits focus 1–120, short 1–30, long 1–60; `CYCLE = 4` (AC1, AC12, BR-5).
- `Timer { phase; status; endAt: number | null; remainingMs: number; durationMs: number; completed: 0..4; phaseId: number }`. Invariants: `running ⇔ endAt !== null`; `0 ≤ remainingMs ≤ durationMs`; `durationMs` is snapshotted at phase load, so settings edits never touch a started phase (AC13).
- `PhaseEnd { phaseId; ended: Phase; next: Phase; away: boolean }` — emitted by a natural end only, never by Skip/Reset; `away` = overdue end handled idle (AC21 caption "…while you were away").

**Engine** (`src/domain/timer.ts`, all pure, `now` = epoch ms)
- `initialTimer(s)`, `isFresh(t, s)` (idle at full settings duration → Reset `aria-disabled`, E9), `remaining(t, now)` = running ? `clamp(endAt − now, 0, durationMs)` : `remainingMs` (E1), `progress(t, now)` = `1 − remaining/durationMs` (AC7).
- `nextPhase(phase, completed, counted)` → `{phase, completed}`: focus counted → `completed+1`, then `completed === 4 ? long : short`; focus skipped → completed unchanged, `short` (completed ≤ 3 in Focus); short → focus; long → focus, `completed = 0` (AC8, AC9, E8).
- `start`, `pause`, `reset`, `skip`, `complete` return `{ timer, end?: PhaseEnd }`; unchanged object when the guard fails (no-op).

| From | Event | Guard | To | ACs |
|---|---|---|---|---|
| idle / paused | `start(now)` | – | running, `endAt = now + remainingMs` | AC2, AC4 |
| running | `start` | – | no-op | E3 |
| running | `pause(now)` | – | paused, `remainingMs = remaining(now)`, `endAt = null` | AC3 |
| any | `reset(s)` | – | idle, `durationMs = remainingMs = minutes(phase, s)`; completed kept; no-op if already equal | AC5, E9 |
| any | `skip(s, now)` | `now − lastTransitionAt ≥ 300 ms` | `nextPhase(…, counted=false)`, full duration, running if `autoStart` else idle; `phaseId+1` | AC6, E3, E8, E9 |
| running | `complete(s, now, mode)` | `now ≥ endAt` | `nextPhase(…, counted=true)`, `phaseId+1`, emits `PhaseEnd`; `mode='live'` and lateness `now − endAt ≤ AWAY_MS` → running if `autoStart`; else idle | AC8–AC10, AC21, BR-9 |
| idle / paused | `complete` | – | no-op | E4 |

- `AWAY_MS = 90_000` — confirmed by the user (2026-11-19, "Accept 90 s rule"): an end handled > 90 s late (sleep, long throttling) or after a reload (`mode='load'`) → next phase idle, one alert (BR-9). Within 90 s (normal or throttled hidden tab) → Auto-start applies from `now`. The 90 s margin over ~1 min hidden-tab timer alignment is the architect's estimate (browser behaviour unverified).
- `lastTransitionAt` is a non-persisted engine input held in the store (not in `Timer`).

**Store** (`src/store/timerStore.ts`) — `createTimerStore(storage?)` factory (tests inject storage); app singleton `useTimerStore`.
- State: `settings: Settings`, `timer: Timer`, `notifyAsked: boolean` (persisted, E5), `lastEnd: PhaseEnd | null` (not persisted; drives alert + caption), `lastTransitionAt: number` (not persisted).
- Actions (read `Date.now()` internally): `start()`, `pause()`, `reset()`, `skip()` — `start`/`skip`/`reset` set `lastEnd = null` (caption clears); `sync(mode: 'live')`, `restoreOnLoad()` (= `complete(…, 'load')`, always idle on an overdue end; AC19–AC21), `markNotifyAsked()`, `saveSettings(next: Settings): boolean` — all-or-nothing: any invalid field → returns `false`, writes nothing; else replaces all fields incl. toggles; if `status === 'idle'` reloads current phase duration (AC11), else timer untouched (AC13). The sheet edits a local draft; nothing reaches the store before Save.
- Caption (TimerDisplay): `status === 'idle' && lastEnd` → `captionFor(lastEnd)`; paused → "Paused".
- Components select slices (`useTimerStore(s => s.timer.status)`); no component computes transitions.

**Persisted schema** — key `pomodoro-timer`, `version: 1`, `partialize: s => ({ settings, timer, notifyAsked })`
- Stored JSON: `{ "state": { "settings": {focusMin, shortMin, longMin, autoStart, soundOn}, "notifyAsked": false, "timer": {phase, status, endAt, remainingMs, durationMs, completed, phaseId} }, "version": 1 }`; `notifyAsked` not boolean → `false`.
- `storage: createJSONStorage(() => safeStorage)`; `safeStorage` = `StateStorage` whose `getItem` returns `null` when `localStorage` throws or the string fails `JSON.parse`; `setItem` / `removeItem` swallow `SecurityError` / `QuotaExceededError` (E2). Docs: `createJSONStorage` does no validation.
- `export const storageAvailable: boolean` in `persistence.ts` (Q-S2, AC26): probed once at module load — `setItem`/`removeItem` of `pomodoro-timer:probe` in try/catch; `false` if `localStorage` is missing or throws. Static for the session (trade-off: a later quota failure does not flip it; no reactive state for a rare case).
- `merge(persisted, current)` = `{ ...current, ...parsePersisted(persisted, current.settings) }`: each setting field kept only if right type and in range, else default (E10); timer kept only if every field valid and invariants hold, else `initialTimer(settings)` (E2). Timer rules as built: `0 < durationMs ≤ MAX_DURATION_MS` (120 min); `phaseId` a safe integer ≥ 0 (S-03); running rejected when `endAt − now > durationMs + 60 s` (`END_SLACK_MS`).
- `migrate(state, v)`: returns `state` unchanged — `merge` validates anything older or unknown. Bump `version` on any schema change.

**Runtime** (`src/app/runtime.ts`, started once from `main.tsx`, returns cleanup; outside React so StrictMode cannot double it)
- `startRuntime({ store?, onPhaseEnd? })`, idempotent. Subscribes to `timer`: on `endAt` change clear/re-arm one `setTimeout(sync, endAt − now + 50)`, delay clamped to 2^31 − 1 (C7).
- `visibilitychange` (visible) and `window` `focus` → `sync('live')` (AC18, E4).
- `storage` event for key `pomodoro-timer` → `store.persist.rehydrate()` then `sync('live')` (AC23, Zustand "rehydrate on storage event" pattern); `newValue === null` (key removed) ignored, tab keeps its timer (S-04, AC23). Writes happen only on actions, never per tick.
- Sets `document.documentElement.dataset.phase = timer.phase` on every change and once before render.
- On `lastEnd` change (and once at start, for the restore case) → `onPhaseEnd(lastEnd)`, once per `phaseId` per tab. `main.tsx` wires `onPhaseEnd: end => alerts.phaseEnded(end, store.getState().settings)`.

**Services** (no throws; return booleans)
- `notify.ts`: `support(): 'unsupported' | NotificationPermission`; `requestPermission(): Promise<'unsupported' | NotificationPermission>` (never rejects; Safari callback form unverified) — Start click handler calls it, without awaiting, only when `!notifyAsked && support() === 'default'`, then `markNotifyAsked()` (E5; timer starts immediately); `show(title, tag)` → `new Notification(title, { tag })` in try/catch (constructor throws on some mobile browsers). Settings hint N1–N5 = f(`support()`, `notifyAsked`, Sound draft) (AC15). Permission is requested only from a click handler, never because of a stored flag (`notifyAsked` read as `=== true`; security M3).
- `chime.ts`: `arm()` on every Start click — lazily create `AudioContext`, `resume()` (E6); `ready(): boolean` = context exists and `state === 'running'`; `play()` — two short sine tones with gain envelope (~0.6 s, C6); not ready → return silently (reload case, AC21).
- `alerts.ts`: `phaseEnded(end, settings)` (in-tab once-per-`phaseId` is the runtime's job) — sound: `soundOn && chime.ready()` → `claim('sound', end.phaseId, chime.play)`; notification: `notify.support() === 'granted'` → `claim('notify', end.phaseId, () => notify.show(notificationTitleFor(end), 'pomodoro-timer:' + end.phaseId))` (AC14, AC16). Title from `PHASE_LABEL` in `format.ts` (`'Focus finished — Short Break next'`, screen spec § Copy), never from raw storage (security M3).

**Cross-tab alerts** (R-11; E4, AC14: one sound and one notification per phase end, whatever the number of tabs)
- Problem: tabs sharing a running phase each `complete` it in the same ~ms window (before the other's `storage` event lands) and each fire `onPhaseEnd`.
- `claim(kind, phaseId, fn)` in `alerts.ts`: `navigator.locks.request('pomodoro-timer:' + kind + ':' + phaseId, { ifAvailable: true }, async lock => { if (!lock) return; fn(); await wait(CLAIM_HOLD_MS) })`, `.catch(() => {})`. `CLAIM_HOLD_MS = 10_000`. Web Locks are origin-scoped across tabs; `ifAvailable` hands `null` when held, no waiting (MDN `LockManager.request`). First tab plays; the others skip.
- Only tabs that can deliver claim: sound is claimed only by a tab whose chime is `ready()` (Start clicked there), so an unarmed tab never wins the sound and leaves it silent. Notification: any tab with permission (origin-wide).
- Notification `tag` = `pomodoro-timer:<phaseId>`: belt and braces — a duplicate with the same tag closes and replaces the shown one (MDN, `renotify` default `false`); a later phase has a new tag, so it alerts normally.
- No `navigator.locks` (old browser, non-secure context) or `request` throws → run `fn()` directly: notification still deduped by `tag`, a double chime possible (accepted).
- Both tabs hidden: whichever tab completes first claims; hidden tabs still run timers (throttled) and Web Audio, so one tab alerts. Tab opened after the end: storage already holds the next phase → no `lastEnd`, no alert; if no tab was open, `restoreOnLoad` gives one away alert in that tab (AC21).
- Residual: if only an unarmed tab completes (the armed tab adopts the result via `storage` before its own timeout), the end is silent; notification still shown. Same as today; not fixed (would need cross-tab end broadcast).
- `fullscreen.ts`: `supported = document.fullscreenEnabled === true`; `enter(): Promise<boolean>` on `document.documentElement` (false on reject → overlay), `exit()`, `onChange(cb)` via `fullscreenchange`.
- "Allow notifications" button (Q-S1, AC25) in `SettingsSheet` Alerts section: sheet holds local `perm` = `notify.support()` on open; button rendered only while `perm === 'default'` (`denied`/`unsupported` → text hint only; `granted` → neither). Click handler calls `notify.requestPermission()` synchronously (user activation), then `markNotifyAsked()`; on resolve sets `perm` → button/hint re-render. Not part of the draft; Save/Cancel do not affect it.
- Storage hint (Q-S2, AC26): `SettingsSheet` renders one `InlineHint` line when `!storageAvailable` (copy: frontend-design); no other behaviour changes — app runs in memory.

**UI rules**
- `useFocusTrap`: focus on the dialog node itself counts as outside the Tab cycle (Tab → first, Shift+Tab → last).
- `useNow(active)`: `setInterval` 250 ms while running; returns `Date.now()`; also refreshes on `visibilitychange`; if `remaining ≤ 0` calls `sync('live')` (redundant, guarded).
- `ProgressRing`: `motion.circle` `strokeDashoffset` from `progress`, linear 250 ms tween. `reducedMotion="user"` does not cover `strokeDashoffset` (Motion docs: only transform/layout disabled), so the ring uses `useReducedMotion()` → duration 0 (E11).
- `FocusView`: App-local state `focusMode`; supported and `enter()` resolves → native, leave on `fullscreenchange`; else fixed overlay dialog with focus trap, Exit button, Esc keydown on the overlay (AC17, E7).
- `PhaseTabs`: `<ol>` of non-interactive items, `aria-current="step"` on active, no `tabIndex`, no `onClick` (AC24, BR-10). The only `keydown` handlers in the app: Esc in `SettingsSheet` and `FocusView`.
- `useDocumentTitle`: running/paused `MM:SS · Focus — Pomodoro`, idle `Pomodoro` (E12) via `titleFor` in `format.ts`.
- Live region: one visually hidden `<div role="status" aria-live="polite">` in `App.tsx`; App subscribes to the store (`useEffect` + `store.subscribe`) and sets text from `announcementFor(prev, next)`; SettingsSheet reports "Settings saved" through an `onAnnounce` prop. Never per second.

**Tailwind v4 wiring** (`src/index.css`)
- `@import "tailwindcss";` → `@theme { --color-bg-base: #0A0B10; --color-bg-surface; --color-bg-elevated; --color-border-subtle/-strong; --color-text-primary/-secondary/-muted/-on-accent; --color-phase-focus/-short/-long; --color-status-error/-warn; --radius-*; --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif; --ease-out-soft; --breakpoint-*` default } from DESIGN.md tokens (hex, not RGB triplets).
- `@theme inline { --color-accent: var(--accent); }` so `bg-accent`, `text-accent`, `bg-accent/15` resolve at use site (Tailwind docs: `@theme inline` for runtime variables).
- `:root { --accent: var(--color-phase-focus); color-scheme: dark; }` · `[data-phase="short"] { --accent: var(--color-phase-short) }` · `[data-phase="long"] { … }`; `@property --accent { syntax: '<color>'; inherits: true; initial-value: #FF6B6B }` + `transition: --accent 600ms` on `:root`, disabled under `prefers-reduced-motion` (E11).
- Font: `@font-face { font-family: "Inter"; src: url("./assets/fonts/InterVariable.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }` — Vite fingerprints the asset; digits use `tabular-nums` so the swap never shifts them. If the file is missing the stack falls back to system UI, no build break.
- `@custom-variant short (@media (max-height: 560px));` for landscape phones (DESIGN.md Layout). Opacity modifiers on `var()` colours rely on v4 `color-mix` (unverified for `@property` colours; fall back to explicit `--accent-soft` token if not).

## Data and migrations
none — browser `localStorage` only; schema and `version` above.

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Hidden-tab timer throttling delays end alert | Alert late (display exact on return) | One-shot timeout + resync (C7); accepted in ADR 0001 |
| `AWAY_MS` misclassifies a heavily throttled tab as "away" | Next phase waits idle instead of auto-start | 90 s margin; qa checks hidden-tab end in Chrome/Firefox; constant in one place |
| Two open tabs both complete the same phase | Double alert across tabs | Web Locks claim per `phaseId` + Notification `tag` (§ Cross-tab alerts); no locks → possible double chime |
| Only an unarmed tab completes the end | No sound that phase end | Notification still shown; accepted residual (§ Cross-tab alerts) |
| Audio context not running after reload | No sound for AC21 alert | Accepted by E6; notification still shown |
| `Notification` constructor unsupported on Android Chrome | No notification on mobile | try/catch; Settings shows blocked/unsupported hint (AC15) |
| Corrupt/foreign data in the key | Crash on load | `safeStorage` + `parsePersisted` per field; unit tests (E2, E10) |

## Rejected alternatives
- Remaining kept in store and decremented per tick — violates BR-3, drifts in hidden tabs.
- `now` held in the store — re-renders every subscriber 4×/s and writes `localStorage` each tick.
- Timer effects inside React `useEffect` in `App` — StrictMode double-mount risks double timeouts/alerts; runtime module is started once.
- `@fontsource-variable/inter` — a dependency outside the user's list (ADR 0001) for one file; system-only font stack — misses the DESIGN.md Inter look.
- Cross-tab alerts from the visible tab only — no tab alerts when all are hidden (the main use case). `BroadcastChannel` claim — needs a wait-and-elect timeout (delays the sound, timing guess); Web Locks give the mutex with no delay. `localStorage` claim key — cross-tab read-after-write not atomic.
- Overdue-end logic inside `merge` — would also fire on cross-tab rehydrate and break auto-start (AC10); kept in `restoreOnLoad` / `complete`.

## Implementation plan
| Step | What | Files | Depends on | ACs |
|---|---|---|---|---|
| 1 | M1 walking skeleton: scaffold `react-ts`, Tailwind v4 plugin + token stub, Prettier, Vitest jsdom config, scripts; `npm run build`, `lint`, `test` green | tooling files, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts` | – | AC22 (dark base) |
| 2 | M1 engine + settings + format, full unit tests (transition table, limits, clamp) | `src/domain/*` | 1 | AC1, AC5, AC6, AC8–AC10, AC12, AC13, E1, E8, E9 |
| 3 | M1 end-to-end slice: store without persist, `useNow`, `TimerDisplay`, primary Start/Pause/Resume; RTL test Start → 24:59 | `src/store/timerStore.ts`, `src/hooks/useNow.ts`, `src/components/TimerDisplay.tsx`, `src/components/ui/Button.tsx`, `src/App.tsx` | 2 | AC1–AC4 |
| 4 | M2 persistence: `safeStorage`, `storageAvailable` probe, `parsePersisted`, `merge`, `migrate`, `restoreOnLoad` | `src/store/persistence.ts`, `src/store/timerStore.ts` | 3 | AC11, AC19–AC21, AC26 (flag), E2, E10 |
| 5 | M2 runtime: end timeout, resync, storage event, `data-phase`, `AWAY_MS`; fake-timer tests | `src/app/runtime.ts`, `src/main.tsx` | 3 | AC10, AC18, AC23, E3, E4 |
| 6 | M2 timer screen: `ProgressRing`, `PhaseTabs`, `CycleDots`, `TimerControls` (Reset/Skip), `AppHeader`, `IconButton`, tokens complete, layout 360/1280 | `src/components/*` (not `SettingsSheet`, `FocusView`), `src/index.css`, `src/App.tsx` | 3 (parallel with 4, 5) | AC5–AC9 (AC7 ring), AC22, AC24, E11 |
| 7 | M2 settings: `SettingsSheet` (local draft, all-or-nothing Save), `NumberField`, `Toggle`, `InlineHint`, `useFocusTrap`; validation on blur/Save; hint N1–N5; storage hint when `!storageAvailable` | `src/components/SettingsSheet.tsx`, `src/components/ui/{NumberField,Toggle,InlineHint}.tsx`, `src/hooks/useFocusTrap.ts` | 4, 6 | AC11–AC13, AC15, AC24, AC26 |
| 8 | M3 alerts: `notify` (`tag`), `chime` (`ready`), `alerts` (`claim` via Web Locks, § Cross-tab alerts); `notificationTitleFor` from `PHASE_LABEL`; Start handler arms audio + asks permission once (`notifyAsked`); wire `onPhaseEnd` in `main.tsx` (runtime unchanged); idle caption; "Allow notifications" button + G1 in `SettingsSheet` | `src/services/{notify,chime,alerts}.ts`, `src/domain/format.ts`, `src/components/TimerControls.tsx`, `src/main.tsx`, `src/components/SettingsSheet.tsx` (Alerts section only), `src/components/ui/InlineHint.tsx` (info variant) | 5, 6, 7 | AC14–AC16, AC21, AC23, AC25, E4–E6 |
| 9 | M3 focus mode: `fullscreen`, `useFullscreen`, `FocusView` + fallback overlay | `src/services/fullscreen.ts`, `src/hooks/useFullscreen.ts`, `src/components/FocusView.tsx` | 6, 7 (`useFocusTrap`; parallel with 8) | AC17, E7 |
| 10 | M3 polish: `useDocumentTitle`, live region in `App.tsx`, reduced motion, `@property --accent` crossfade, Inter `@font-face` + asset, a11y pass | `src/hooks/useDocumentTitle.ts`, `src/App.tsx`, `src/index.css`, `src/assets/fonts/*` | 6, 8 | E11, E12, AC24 |

**Test strategy**
- Domain: Vitest unit, explicit `now` args, table-driven per transition row; boundaries 0/1/120/121, empty, non-integer (AC12); clock jumps (E1).
- Persistence: `parsePersisted` cases (corrupt JSON, `focusMin: -5`, wrong types, running without `endAt`); `localStorage` throwing via `vi.spyOn(Storage.prototype, …)` (E2, E10).
- Store + runtime: `vi.useFakeTimers()` + `vi.setSystemTime` + `advanceTimersByTime`; dispatch `visibilitychange` exactly at `endAt` → `alerts.phaseEnded` mocked, called once (E4); reload = new `createTimerStore` over the same storage (AC19–AC21).
- Services: stub `Notification`, `AudioContext` (absent in jsdom → silent path), fullscreen absent in jsdom → overlay path (E7). `navigator.locks` absent in jsdom: fake in-memory `LockManager` → two `phaseEnded` calls with one `phaseId` give one `play` + one `show`, a new `phaseId` alerts again, unarmed chime never claims; no `locks` → fallback calls `fn` (tag passed).
- Components: Testing Library + user-event: controls (AC2–AC6), settings validation (AC11–AC13), button per `Notification.permission` default/denied/granted (AC25), hint with `storageAvailable` mocked `false` (AC26), `user.tab()` order and Space/R/S/F on `body` change nothing (AC24).
- Live (qa): AC7 smoothness, AC14 real notification, AC17, AC18 hidden 10 min, AC19–AC21 refresh, AC22 360/1280, AC23 two tabs (Start in both, both hidden at end → one chime, one notification), E6, E7 iOS, E11.

<!-- team-pm turns these steps into tickets in .team/TASKS.md. -->
