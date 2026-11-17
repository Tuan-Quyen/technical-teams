# ADR 0001 — No-build vanilla JS stack (classic scripts, node:test, optional Playwright)

Status: accepted (decided by the user, 2026-11-17) · Date: 2026-11-17 · Item: pomodoro

> Owner: **team-architect**. File: `.team/adr/0001-no-build-vanilla-js-stack.md`; the lead gives NNNN in the brief.

## Context
- Confirmed MVP (`.team/requirements/pomodoro.md`): single-page web app, no backend, localStorage only, one screen plus a settings panel, sound + tab title + opt-in desktop notification, and a running/paused timer that survives reload (AC18-AC22, E1-E6).
- Vision (`.team/PRODUCT.md`): "works instantly in a browser, with no account and no setup".
- The hard part is time logic, not UI: wall-clock based countdown (AC5, E4), reload catch-up with exactly one transition (AC20, AC21), the 4th-session long break (AC7), local-date rollover (AC17, E7), two tabs counting once (E5). This logic must be unit-testable with an injected clock.
- Greenfield repo; Node 22 and Chrome are available locally. Project is small (estimated a few hundred lines of JS).
- ES modules loaded from files (`<script type="module" src>`) fail on `file://` in Chrome because the page origin is opaque and module scripts are fetched in CORS mode (MDN, "JavaScript modules", section on local testing: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules). So "open by double-click" and "split into ES modules" conflict unless a build inlines everything or a server is used.

## Decision
Use plain HTML, CSS and JavaScript with **no build step and no runtime dependencies**:
- `index.html` loads a few **classic** `<script defer src>` files (not modules), so the app opens from `file://` by double-click and from any static host unchanged.
- Timer logic lives in one pure file (`src/core.js`): functions of `(state, event, nowMs)` returning new state, no DOM, no `Date.now()` inside. It attaches to one namespace (`globalThis.Pomodoro`) and also sets `module.exports` when `module` exists, so Node can `require` it.
- Browser-specific code is thin and separate: `src/storage.js` (localStorage with try/catch fallback to memory, E6, versioned prefixed keys), `src/alerts.js` (sound, title, Notification), `src/app.js` (DOM, tick loop that recomputes from the stored end timestamp, `storage` event for E5). Details: `.team/system-design/pomodoro.md`.
- Unit tests: Node's built-in test runner, `node --test` (https://nodejs.org/docs/latest-v22.x/api/test.html), zero dependencies.
- Browser checks (reload resume, background tab, permissions): Playwright as the only dev dependency, using its clock control (`page.clock`, https://playwright.dev/docs/clock) against the `file://` URL or a throwaway static server. Optional for the developer; QA's live preview can drive Chrome directly.
- Type safety, if wanted later: `// @ts-check` with JSDoc, checked by `tsc --noEmit`; not required for the MVP.

## Alternatives
| Option | Why not |
|---|---|
| Vanilla ES modules + `node --test`, served by a static server (`npx http-server`, `python3 -m http.server`) | Cleaner imports, same testability, but cannot be opened by double-click; every run needs a server command, which contradicts "no setup" for a local user. Fine if the app is only ever used from a host; becomes the natural upgrade path if the code grows. |
| Vite + TypeScript + Vitest (fake timers) | Best developer ergonomics and types, but adds a toolchain (~3 dev deps, config, `npm install`, build output) for a few hundred lines. Built output is again a module script, so `file://` needs a single-file inlining plugin or a server (not verified here). Cost outweighs benefit at this size. |
| A UI framework (React, Svelte, Vue) | One screen with ~6 controls; a framework adds bundle size and a build without solving the real risk, which is time logic. |

## Consequences
- Good: zero install to run (`open index.html`), zero install to unit-test (`node --test`), nothing to upgrade or audit at runtime, trivial static hosting (any file host, GitHub Pages).
- Good: forcing the clock as a parameter makes AC5, AC18-AC21, E4, E7 testable as plain functions, independent of any stack.
- Bad: classic scripts share the global scope; the convention of one namespace and a fixed `<script>` order must be respected, and there are no `import`s to show dependencies.
- Bad: the `module.exports` guard in `core.js` is a small dual-environment hack; if the code grows past a handful of files, switch to ES modules plus a static server (first alternative) via a new ADR.
- Risk: on `file://`, Chrome may refuse or not persist desktop notification permission, and localStorage on `file://` is shared by all local files. Not verified; E2 already requires graceful fallback, and the notification checks should be run over `http://localhost` as well as `file://`.
- No type checker by default; mitigated by unit tests on the core and optional `// @ts-check`.
