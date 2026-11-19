# Architecture

> Owner: **team-architect**. The system as it is now, at most ~200 lines. Reasons live in `.team/adr/`; link to them by number instead of copying.
> **Budget:** ≤ 200 lines. Shape of the system now; reasons are ADR links.

Status: shipped 0.1.0 (`CHANGELOG.md`); stack per ADR 0001 (accepted). Archived design: `.team/archive/pomodoro-timer/system-design/pomodoro-timer.md`.

## Purpose and context
- Single-page Pomodoro Timer Core (requirements `.team/archive/pomodoro-timer/requirements/pomodoro-timer.md`, S1–S10).
- Runs fully in the browser; talks to no server. Browser APIs: `localStorage`, Notification API, Fullscreen API, Page Visibility API, Web Audio, `storage` event, Web Locks (one alert per phase end across tabs).
- No backend, no router, no keyboard shortcuts, no modules beyond Timer Core (BR-6, BR-10).

## Building blocks
| Component | Responsibility | Tech | Code location |
|---|---|---|---|
| Timer engine | Pure functions: phase sequence (BR-2), start/pause/reset/skip/complete, `remaining(now)` from `endAt`, clamp 0..total (E1), `phaseId` guard; settings bounds; UI copy/format builders | TypeScript, no React | `src/domain/{types,timer,settings,format}.ts` |
| Timer store | Single source of truth: settings, timer, `notifyAsked`; actions call the engine; persisted with validation (E2, E10) | Zustand + `persist` (ADR 0001) | `src/store/timerStore.ts`, `src/store/persistence.ts` |
| Runtime | One-shot timeout at `endAt`, resync on `visibilitychange`/`focus`, cross-tab rehydrate, `data-phase`, alert dispatch; started once outside React | TypeScript | `src/app/runtime.ts`, wired in `src/main.tsx:15` |
| Services | Notification, Web Audio chime, alerts dedupe (Web Locks), Fullscreen; feature-detected, never throw | Browser APIs | `src/services/{notify,chime,alerts,fullscreen}.ts` |
| Hooks | Display tick, document title, fullscreen state, focus trap | React | `src/hooks/{useNow,useDocumentTitle,useFullscreen,useFocusTrap}.ts` |
| UI | Header, phase tabs, ring, digits, controls, cycle dots, settings sheet, focus view; dark only | React, Tailwind v4, Motion, Lucide | `src/components/`, `src/components/ui/`, `src/App.tsx` |
| Styles and assets | `@theme` tokens; self-hosted Inter (OFL) | Tailwind v4 CSS | `src/index.css`, `src/assets/fonts/` |
| Tests | Co-located `*.test.ts(x)`; jsdom setup | Vitest, Testing Library | `src/**/*.test.ts(x)`, `src/test/setup.ts` |

- Dependency direction: `components → hooks → store → domain`; `app/runtime` and `services` are called by store subscribers and click handlers; `domain` imports nothing from React, store or browser APIs.

## Key flows
- Start: click → `start()` sets `endAt = now + remainingMs`; same handler arms audio and, once ever (`notifyAsked`), requests notification permission.
- Tick: `useNow` re-renders every 250 ms while running; remaining derived from `endAt`; ticks never write state (BR-3).
- Phase end: runtime timeout or resync → `sync()` → engine `complete` (once per `phaseId`, E3/E4) → `lastEnd` → alerts; next phase auto-starts if `autoStart`, unless the end is > 90 s overdue (asleep → idle, BR-9).
- Refresh: store hydrates synchronously before render → `restoreOnLoad()`: overdue → next phase idle + one alert (AC21); running → continue (AC19); paused → exact (AC20).
- Other tab: `storage` event → `persist.rehydrate()` → `sync()`; last write wins (AC23).

## Data
- One `localStorage` key `pomodoro-timer`, Zustand `persist` JSON, `version: 1`; code `src/store/persistence.ts`.
- Stored JSON: `{ "state": { "settings": {focusMin, shortMin, longMin, autoStart, soundOn}, "notifyAsked": bool, "timer": {phase, status, endAt, remainingMs, durationMs, completed, phaseId} }, "version": 1 }`.
- Timer invariants: `running ⇔ endAt !== null`; `0 ≤ remainingMs ≤ durationMs ≤ 120 min`; `completed` 0..4; `phaseId` safe integer ≥ 0. Not persisted: `lastEnd`, `lastTransitionAt`, UI state.
- Read through a safe storage wrapper (`storageAvailable` probe on key `pomodoro-timer:probe`) + validating `merge`: bad setting field → default (E10); any bad timer field → fresh timer (E2). `migrate` is identity; schema change → bump `version`.

## Operations
- Node v24.13.1, npm 11.8.0 (checked by the lead); standalone package in `example/pomodoro-timer/`.
- Commands (`package.json`): `npm install`, `npm run dev`, `npm run build` (`tsc -b && vite build`), `npm run lint` (`eslint . && prettier --check .`), `npm test` (`vitest run`), `npm run preview`.
- Config files: `vite.config.ts` (React, Tailwind, Vitest `test` block), `tsconfig*.json` (strict), `eslint.config.js`, `.prettierrc.json`.
- CI: `.github/workflows/pomodoro-timer.yml` (repo root) — on push/PR touching `example/pomodoro-timer/**`; ubuntu, Node 22: `npm ci`, `npm run lint`, `npm test`, `npm run build`.
- Deploy: static `dist/`; no deploy target; CSP notes in `README.md` § Deployment.

## Conventions
- TypeScript `strict: true`; no `any`, no non-null `!` on storage data.
- Remaining time is always derived from timestamps; never store or count ticks.
- Domain logic and UI copy builders live in `src/domain/` as pure functions with unit tests; components stay presentational.
- Every browser API call is wrapped in try/catch or feature-detected; failure is silent and never blocks the timer.
- No `keydown` handlers on `document`; only Esc inside the settings sheet and focus view overlay (AC24).
- Tokens live in `src/index.css` `@theme`; components use `accent`, never a phase colour; `data-phase` on `<html>` swaps `--accent`.
- Animations respect reduced motion (E11) and never drive timer state.
- No runtime dependencies beyond ADR 0001; assets (Inter font, OFL) are committed files.

## Decision index
| ADR | Title | Status |
|---|---|---|
| 0001 | Frontend stack and tooling | accepted |
