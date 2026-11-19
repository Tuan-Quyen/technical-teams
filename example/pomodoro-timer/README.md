# Pomodoro Timer

A single-screen Pomodoro timer that runs entirely in the browser. No backend, no account. Dark theme, English UI.

## Quick start

Requires Node 22.12+ (Vite 8 / Vitest 5).

```bash
npm install
npm run dev       # dev server (Vite prints the local URL)
npm test          # unit + component tests (Vitest, runs once)
npm run lint      # ESLint + Prettier check
npm run format    # Prettier write
npm run build     # type-check (tsc -b) + production build into dist/
npm run preview   # serve the built dist/ locally
```

CI: `.github/workflows/pomodoro-timer.yml` (repo root) runs `npm ci`, `npm run lint`, `npm test` and `npm run build` on Node 22 for changes under `example/pomodoro-timer/**`.

## Features

- Three phases: Focus 25 min, Short Break 5 min, Long Break 15 min (defaults).
- Fixed cycle of 4: the Long Break follows the 4th Focus.
- Start / Pause / Resume, Reset (current phase only), Skip (a skipped Focus does not count toward the cycle).
- Auto-start the next phase (on by default, Settings toggle).
- End-of-phase alert: one synthesised chime (Sound toggle) and a system notification.
- Fullscreen Focus Mode; falls back to an in-app overlay when fullscreen is unavailable.
- Animated progress ring, 4 cycle dots (`n/4`), phase tabs (display only, not clickable; Skip is the only way to move on).
- Tab title shows the remaining time and phase while running or paused (`24:59 · Focus — Pomodoro`), plain `Pomodoro` when idle.
- No keyboard shortcuts: Tab / Enter / Space operate every control.

## Settings and limits

Whole minutes only.

| Setting     | Default | Range |
| ----------- | ------- | ----- |
| Focus       | 25      | 1-120 |
| Short Break | 5       | 1-30  |
| Long Break  | 15      | 1-60  |

Also: Auto-start, Sound, and "Allow notifications" (offered only while the browser can still ask; a blocked state is shown). A duration changed mid-run applies from the next phase of that type. If LocalStorage is unavailable, Settings says nothing will be saved and the timer still works for the session.

## Browser support and permissions

Target: modern evergreen browsers (latest Chrome, Edge, Firefox, Safari). No version matrix has been decided.

| API                  | If missing or refused                                                |
| -------------------- | -------------------------------------------------------------------- |
| Notification         | No system notification; the chime still plays and no error is shown. |
| Web Audio            | No chime; notification still shows.                                  |
| Fullscreen           | In-app overlay instead (e.g. iPhone Safari).                         |
| Web Locks (optional) | Works; the chime may play twice with two tabs open.                  |

- **Notifications**: permission is asked on the first Start, or via "Allow notifications" in Settings. Never on page load. Needs a secure context (HTTPS or `localhost`).
- **Sound**: one chime generated with Web Audio, no audio file. Browsers allow audio only after a click; if still blocked, it fails silently.
- **Fullscreen**: requested on a click; Esc or the Exit button leaves it, the timer is unaffected.

## How timing works

- **Timestamp-based**: the timer stores when the phase ends and computes remaining time from the clock, so it does not drift. A tick redraws the display; a one-shot timeout fires at the end time.
- **Background tabs**: on return (`visibilitychange` / `focus`) the display resyncs and is exact. A hidden tab may fire the end alert late if the browser throttles timers.
- **Refresh**: state is saved in LocalStorage under the key `pomodoro-timer` and restored on reload; a running timer keeps running.
- **Late or missed end**: a phase end handled more than 90 s late, or found after a reload, leaves the next phase waiting (no auto-start), shows one alert and a "while you were away" caption.
- **Two tabs**: last write wins. Clearing site data in another tab does not reset a running timer.

## Known limitations

- If Start was pressed only in tab A and tab B finishes the phase first, no sound plays (the notification still shows).
- Browsers without Web Locks may play the chime twice when two tabs are open.
- After a reload, a missed phase end shows the notification and caption but no chime (audio needs a click first).
- The 90 s "away" margin is an estimate.
- Not verified in a real browser by QA: background-tab (hidden) accuracy, sound, notifications, two tabs, fullscreen and screen readers. These are covered by automated tests only.

## Deployment

No hosting is set up. `npm run build` writes static files to `dist/`: `index.html`, `assets/index-*.js`, `assets/index-*.css`, `assets/InterVariable-*.woff2`. `npm run preview` serves them on port 4173.

- Host at the root of its own HTTPS origin. Vite `base` is `/`, so a sub-path breaks asset URLs. Notifications and Web Locks need a secure context. A shared origin shares the `pomodoro-timer` LocalStorage key.
- Response headers:

  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: fullscreen=(self)
  Strict-Transport-Security: max-age=31536000
  ```

- Caching: `Cache-Control: public, max-age=31536000, immutable` on `/assets/*`, `no-cache` on `index.html`.
- Strict `style-src 'self'` is expected to work (no inline `<style>` or `style=` in `dist/index.html`; runtime styles go through the CSSOM) but is unverified in a browser. If the console shows CSP violations, relax to `style-src 'self' 'unsafe-inline'`.
- Rollback: redeploy the previous build. Hashed assets and a `no-cache` index make it safe; there is no data migration.

## Project structure

```
src/
  domain/       pure timer engine, settings, formatting (no browser APIs)
  store/        Zustand store + LocalStorage persistence
  app/          runtime: ticks, resync, cross-tab sync, alerts wiring
  services/     chime (Web Audio), notifications, alerts, fullscreen
  hooks/        useNow, useFullscreen, useFocusTrap, useDocumentTitle
  components/   screens and controls; ui/ holds Button, Toggle, NumberField...
  assets/fonts/ Inter variable font + OFL.txt
  test/         Vitest setup
```

Tests sit next to the code as `*.test.ts(x)`.

## Tech stack

React 19, TypeScript (strict), Vite, Tailwind CSS v4, Zustand, `motion` (Framer Motion), Lucide React, Vitest + Testing Library. Reasons and alternatives: [ADR 0001](.team/adr/0001-frontend-stack.md).

Font: Inter v4.1, SIL Open Font License 1.1, self-hosted (`src/assets/fonts/OFL.txt`).
