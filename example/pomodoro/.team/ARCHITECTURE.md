# Architecture

> Owner: **team-architect**. The system as it is now, at most ~200 lines. Reasons live in `.team/adr/`; link to them by number instead of copying.

> Status: current as designed. Stack decided (ADR 0001, accepted 2026-11-17); code not yet written. Details per item: `.team/system-design/pomodoro.md`.

## Purpose and context
A single-page Pomodoro timer for individuals (focus / short break / long break, today's count, reload resume). Runs entirely in the browser, opens from `file://` or any static host, and talks to no server. Browser APIs used: localStorage, `storage` event, Web Audio, `document.title`, Notification (opt-in). Requirements: `.team/requirements/pomodoro.md`. UI rules: `.team/frontend-design/DESIGN.md`.

## Building blocks
| Component | Responsibility | Tech | Code location |
|---|---|---|---|
| Page shell | Markup hooks, design tokens, script order | HTML, CSS custom properties | `index.html`, `styles.css` |
| Timer core | Pure state machine: `reduce(state, event, nowMs) → {state, effects}`, `restore`, `adopt`, validation, formatting, local-date count | Plain JS, no DOM, `globalThis.Pomodoro.core` + `module.exports` guard | `src/core.js` |
| Storage | Load/save three versioned prefixed keys; invalid → `null`; memory fallback when localStorage throws | Plain JS, same guard (`Pomodoro.storage`) | `src/storage.js` |
| Alerts | Beep (Web Audio oscillator), tab title, desktop notification | Plain JS, browser only | `src/alerts.js` |
| App | Render, handlers, 250 ms render loop + one-shot end timeout, `visibilitychange`, cross-tab `storage` sync, effects → alerts | Plain JS, browser only | `src/app.js` |
| Tests | Unit tests of core and storage with injected clock and fake backend; optional browser tests | `node --test`; Playwright (dev only) | `tests/`, `e2e/` |

## Key flows
- Start: click → core sets `endAt = now + duration` → storage saves → render shows `endAt - now`; one-shot timeout armed at `endAt`.
- Pause/resume: pause stores `remainingMs` and clears `endAt`; resume sets a new `endAt`.
- Phase end (live): `tick` with `now >= endAt` → one transition (count, next phase idle) → effect → beep, title, optional notification, live region.
- Reload: storage loads → `core.restore` reconciles with `now` (running → remaining; ended → one transition, no sound, "Focus finished at hh:mm"; invalid → defaults).
- Two tabs: a `storage` event → `core.adopt`; a focus end is counted once via `today.lastCountedEndAt`.

## Data
localStorage only: `pomodoro:v1:settings`, `pomodoro:v1:timer`, `pomodoro:v1:today`, each JSON with `"v": 1`. Shapes are in `.team/system-design/pomodoro.md` ("Persistence schema"). There is no migration tool: a version mismatch means defaults, or a migration step in `storage.load` when v2 arrives.

## Operations
- Run: open `index.html` in a browser (works from `file://`), or serve the folder with any static server.
- Unit tests: `npm test` (`node --test tests/`, Node 22, no install needed).
- Browser tests (optional): `npm install` (Playwright only), then `npm run e2e`.
- Deploy: copy the folder to any static host. No build; to roll back, redeploy the previous files.

## Conventions
- Classic scripts only, no `import`/`export`; one global namespace `Pomodoro`; script order in `index.html` is core → storage → alerts → app.
- `src/core.js` never touches DOM, storage or `Date.now()`; time is passed in, and side effects are returned as effects.
- Remaining time is always derived from timestamps, never from counting ticks.
- Every localStorage access goes through `src/storage.js` and is wrapped in try/catch.
- CSS reads only the tokens from `.team/frontend-design/DESIGN.md`; components use `--accent*` / `--tint`, never a phase-specific token.

## Decision index
| ADR | Title | Status |
|---|---|---|
| 0001 | No-build vanilla JS stack (classic scripts, node:test, optional Playwright) | accepted |
