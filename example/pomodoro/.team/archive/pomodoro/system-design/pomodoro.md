# pomodoro — system design

Status: draft

## Approach
Greenfield static page per ADR 0001 (accepted): plain HTML/CSS/JS, classic `<script defer>` files, no build, unit tests with `node --test`. The design is split into four parts:
1. A **pure core** (`src/core.js`) owns every rule. It works on plain data, receives time as `nowMs`, never touches DOM, storage or `Date.now()`, and returns new state plus a list of **effects** (what happened) for the shell to act on.
2. **Storage** (`src/storage.js`) loads and saves three versioned, prefixed localStorage keys. It falls back to memory when localStorage throws (E6) and returns `null` for anything it cannot parse (AC22).
3. **Alerts** (`src/alerts.js`) wraps the browser side effects: a sound from a Web Audio oscillator, the tab title, and the Notification API.
4. **App** (`src/app.js`) is the only wiring. It renders state into the DOM, maps clicks to core events, runs the tick loop and listens for `storage` events from other tabs.

Remaining time is always `endAt - now`, never a counted tick, so a background tab, sleep or reload cannot drift (AC5, E4). The visual rules come from `.team/frontend-design/DESIGN.md`. This design names only the hooks the UI depends on, such as `data-phase` and the live region. The screen spec `.team/frontend-design/pomodoro.md` does not exist yet, so the DOM structure beyond those hooks is left to it.

## Components and files
| Area | Files | Change |
|---|---|---|
| frontend / page | `index.html` | New. One `<main>` phase panel with `data-phase="focus|short|long"` on the app root, `role="timer"` display, primary button (one node whose label swaps Start/Pause/Resume), Reset, Skip, session count, one `aria-live="polite"` region, inline banner slot, Settings icon button, `<dialog>` settings form (3 text inputs `inputmode="numeric"`, notification checkbox, Cancel, Save). Scripts in order: `src/core.js`, `src/storage.js`, `src/alerts.js`, `src/app.js`, all `defer`. `<html lang="en">` |
| frontend / style | `styles.css` | New. Tokens exactly as listed in `.team/frontend-design/DESIGN.md` (Foundations): `--color-*`, `--phase-*-accent/-hover/-tint` remapped to `--accent`, `--accent-hover`, `--on-accent`, `--tint` by `[data-phase]`; `--font-*`, `--space-1…8`, `--gutter`, `--radius-*`, `--control-height`, `--focus-ring`, `--duration-*`, `--ease-standard`; dark mode via `prefers-color-scheme`; durations `0ms` under `prefers-reduced-motion` |
| frontend / logic | `src/core.js` | New. Pure state machine, validation, formatting, restore/reconcile (contract below) |
| data | `src/storage.js` | New. Keys, (de)serialise, schema validation, memory fallback (contract below) |
| frontend / effects | `src/alerts.js` | New. `unlockAudio()`, `beep()`, `setTitle(text)`, `notificationSupport()`, `requestNotificationPermission()`, `notify(text)` |
| frontend / wiring | `src/app.js` | New. Boot, render, event handlers, tick loop, one-shot end timer, `visibilitychange` and `storage` listeners |
| tests | `tests/core.test.js`, `tests/storage.test.js` | New. `node:test` + `node:assert/strict`, fake clock by passing `nowMs`, fake storage backend object |
| tests (optional) | `e2e/pomodoro.spec.js`, `playwright.config.js` | New. Playwright with `page.clock` for AC2, AC5, AC10, AC18-AC20 against `file://.../index.html` |
| tooling | `package.json` | New. `"private": true`, `"scripts": {"test": "node --test tests/", "e2e": "playwright test"}`, Playwright as the only devDependency (added in the e2e step). No `"type": "module"` (the files are classic scripts and CommonJS-guarded) |

## Contracts

**Namespace and Node export.** Each of `core.js` and `storage.js` ends with this guard:
`(globalThis.Pomodoro ||= {}).core = api; if (typeof module === "object" && module.exports) module.exports = api;`
(`storage.js` sets `.storage` instead of `.core`.) `alerts.js` and `app.js` run in the browser only.

**Core data (in memory)**
```
State = {
  settings: { focusMin: int 1..180, shortMin: int 1..180, longMin: int 1..180, notify: bool },
  timer:    { phase: "focus"|"short"|"long", status: "idle"|"running"|"paused",
              endAt: ms|null,        // set only when running
              remainingMs: ms|null }, // set only when paused
  today:    { date: "YYYY-MM-DD" (local), count: int >= 0, lastCountedEndAt: ms|null },
  notice:   null | { kind: "focusFinished", at: ms }   // drives the AC20 banner; not persisted
}
Effect = { type: "phaseEnded", finished: phase, next: phase, live: bool }
       | { type: "persist" }            // shell must save state
```
Defaults: 25 / 5 / 15 min, `notify: false`, timer `{focus, idle, null, null}`, count 0 (AC1).

**Core functions** (all pure, `nowMs` is epoch ms)
| Function | Behaviour | ACs |
|---|---|---|
| `initialState(nowMs)` | Defaults, `today.date = dateKey(nowMs)` | AC1 |
| `reduce(state, event, nowMs) → { state, effects }` | Applies one event (table below). Always rolls `today` over first: if `dateKey(nowMs) !== today.date` → `{date: dateKey(nowMs), count: 0}` | AC2-AC14, AC17, E7 |
| `restore(stored, nowMs) → { state, effects }` | Reconciles data loaded at boot (rules below) | AC16-AC22 |
| `adopt(state, stored) → state` | Takes another tab's saved state without catch-up effects. Used on the `storage` event | E5 |
| `remainingMs(state, nowMs)` | running: `max(0, endAt - now)`; paused: `remainingMs`; idle: `durationMs(phase)` from the current settings | AC3, AC12, AC14 |
| `formatClock(ms)` | `mm:ss` with seconds rounded **up** (`Math.ceil(ms/1000)`): shows 25:00 at start and 24:59 after 1 s. 180 min → "180:00" | AC2 |
| `titleFor(state, nowMs)` | `"<Phase name> - mm:ss"` for all statuses, e.g. "Short break - 05:00" | AC10 |
| `validateDuration(text) → {ok:true, value} \| {ok:false, error}` | Accepts `/^\s*\d+\s*$/` with value 1..180; else error "Enter a whole number from 1 to 180" | AC13, E8 |
| `dateKey(ms)` | Local `YYYY-MM-DD` from `new Date(ms)` local getters | AC17, E7 |
| `phaseName(phase)` | "Focus", "Short break", "Long break" | AC1 |

**Events for `reduce`**
| Event | From → to | Effects |
|---|---|---|
| `{type:"start"}` | idle → running, `endAt = now + durationMs(phase)` | persist |
| `{type:"pause"}` | running → paused, `remainingMs = max(0, endAt - now)`, `endAt = null` | persist |
| `{type:"resume"}` | paused → running, `endAt = now + remainingMs` | persist |
| `{type:"reset"}` | any → same phase idle; count unchanged | persist |
| `{type:"skip"}` | focus → short idle (no count, always short: assumption, see Risks); short/long → focus idle | persist |
| `{type:"tick"}` | if running and `now >= endAt` → **transition(endAt)**; else no change | phaseEnded(live:true) + persist, or none |
| `{type:"saveSettings", settings}` | replaces settings; timer untouched, so a running or paused phase keeps its `endAt` or `remainingMs` and the idle display picks up the new duration | persist |
| `{type:"dismissNotice"}` | `notice = null` | none |

**transition(endAt)** is shared by `tick` and `restore`:
- **Focus end.** Unless `today.lastCountedEndAt === endAt` (the E5 guard), count it toward `dateKey(endAt)`. If that is not the current `today.date`, the session belongs to a past day and today's count stays as rolled over (AC17, E7). Then set `lastCountedEndAt = endAt`. The next phase is `long` when the new count is a positive multiple of 4, otherwise `short` (AC6, AC7).
- **Break end.** The next phase is `focus` (AC8).
- The next phase is always idle with `endAt` and `remainingMs` null (BR-5). Exactly one transition happens per call; phases never chain (AC21).

**Reload rules (`restore`)**: `stored` is `{settings|null, timer|null, today|null}` from storage. Each part is validated on its own: a null or invalid part becomes its default, so corrupt timer data never resets valid settings.
| Stored timer | Result | Effects | AC |
|---|---|---|---|
| running, `endAt > now` | running with the same `endAt`. Shows `endAt - now`, keeps counting without a click | none | AC18 |
| paused | paused with the same `remainingMs`, however long ago | none | AC19 |
| running, `endAt <= now`, phase focus | transition(endAt). `notice = {focusFinished, at: endAt}` gives the banner "Focus finished at hh:mm" (local, 24 h) | phaseEnded(live:false): **no sound, no notification** | AC20 |
| running, `endAt <= now`, phase break | transition(endAt) → focus idle. No banner (assumption, see Risks) | phaseEnded(live:false) | AC21 |
| idle | idle in the stored phase | none | AC16 |
| missing / invalid / wrong version | focus idle at the configured duration, no error | none | AC22, E6 |

Invalid means any of these: JSON parse fails, `v !== 1`, an unknown phase or status, running without a finite `endAt`, paused without `remainingMs >= 0`, or `endAt` more than 180 min plus 1 min after `now` (clock moved back or the data was tampered with).

**Persistence schema (localStorage).** The three keys share the prefix `pomodoro:v1:`. Each value is JSON carrying `"v": 1`.
| Key | Value |
|---|---|
| `pomodoro:v1:settings` | `{v, focusMin, shortMin, longMin, notify}` |
| `pomodoro:v1:timer` | `{v, phase, status, endAt, remainingMs}` |
| `pomodoro:v1:today` | `{v, date, count, lastCountedEndAt}` |

Storage API: `createStorage(backend?)` returns `{ load() → {settings, timer, today}, save(state), isPersistent: bool }`. `backend` defaults to `globalThis.localStorage`; tests pass a plain object with `getItem/setItem/removeItem`. Every call is wrapped in try/catch. If the first access throws, the store switches to an in-memory Map and reports `isPersistent: false` (E6). `save` writes only the keys whose JSON changed, which keeps `storage` events between tabs to a minimum. A future `v2` adds a migration in `load` or falls back to defaults; there is no migration tool.

**Alerts adapter** (`src/alerts.js`, browser only)
- `unlockAudio()` runs from the Start and Resume click handlers. It creates or resumes one `AudioContext` inside the user gesture, which avoids autoplay blocking (E3).
- `beep()` plays one oscillator tone of about 0.6 s with a gain envelope. There is no audio file and no loop, and it stays under 3 s (DESIGN.md "Sound").
- `setTitle(text)` sets `document.title`. The shell calls it from every render with `core.titleFor`.
- `notificationSupport()` returns `"unsupported" | "default" | "granted" | "denied"`.
- `requestNotificationPermission()` is called only from the "Desktop notification" checkbox change, so it runs inside a user gesture and the app never prompts on load. If the result is not `granted`, the checkbox goes back to off and the warning banner shows (E2).
- `notify(text)` creates `new Notification("Pomodoro", {body: text})` only if `settings.notify` is on and permission is `granted`. All errors are swallowed (AC11, E2).
- When a phaseEnded effect has `live:true`, the shell calls `beep()`, `notify("<Finished> finished. <Next> is ready.")` and the live-region message from DESIGN.md "Copy". When `live:false`, the shell does nothing audible and shows only the banner and the live-region restore message.

**Tick loop and background tabs** (`src/app.js`)
- A render interval of 250 ms recomputes from `endAt`, which keeps the seconds display fresh. On top of that, the app schedules one `setTimeout(onEnd, endAt - now)` whenever a run starts, resumes or is restored, and clears it on pause, reset or skip. Because it is a single one-shot timeout rather than a chain, Chrome's intensive throttling of chained timers in hidden pages should not delay the phase end by up to a minute (Chrome 88 timer-throttling notes, https://developer.chrome.com/blog/timer-throttling-in-chrome-88). This is to be verified in QA (see Risks).
- On `visibilitychange` to visible, the app dispatches `tick` and renders (AC5, E4).

**Two tabs (E5)**
- Storage is the shared truth. On a `storage` event for a `pomodoro:v1:` key, the tab runs `state = core.adopt(state, storage.load())`, re-arms or clears its one-shot timeout from the adopted timer, and renders. It plays no sound.
- On its own phase end, a tab first adopts the stored state, then dispatches `tick`. If the other tab already moved on, the stored timer is idle in the next phase, so `tick` does nothing and the tab plays no alert. If both tabs pass that check at once, the `lastCountedEndAt === endAt` guard still keeps the count to one.
- The remaining gap: two tabs firing within the same few milliseconds could both alert, though they still count once. This is accepted; see Risks.

**Midnight while open (AC17, E7).** Every `reduce`, including `tick`, rolls `today` over first, so the count shows 0 after local midnight without a reload.

## Data and migrations
none (browser localStorage only; schema above, versioned by the `v1` key prefix and the `v` field)

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Chrome throttles timers in hidden tabs | Background phase end, sound and title arrive late (AC10) | One-shot `setTimeout` at `endAt` plus recompute on `visibilitychange`. QA checks a hidden tab for more than 5 min (Playwright cannot fully emulate this, so check manually in Chrome). Not verified here |
| Notification permission on `file://` | AC11 may not work when the page is opened by double-click | E2 fallback covers it. QA runs AC11 on `http://localhost` and records the `file://` behaviour; if it fails there, README tells users to serve or host the folder. Not verified |
| localStorage on `file://` may be shared by every local file | Key collision with other local pages | The `pomodoro:v1:` prefix |
| Two tabs both alert in the same ms window | Sound plays twice, count still once | Accepted for the MVP; Web Locks (`navigator.locks`) is the upgrade if it matters |
| Long-break rule uses **today's** count | A session counted after midnight resets the cycle (count 1 → short break), so a cycle can span days inconsistently | Matches AC6/AC7, which are phrased with "completed count". Flag for the BA/user; a separate cycle counter is a small change in `core.js` |
| Assumptions added by this design | Behaviour the user did not confirm | (a) Skip during focus always goes to a short break. (b) A break that ends while the page is closed shows no banner. (c) The title is always "<Phase> - mm:ss", including idle. (c) conflicts with DESIGN.md "Tab title", which says idle shows "Pomodoro", but AC10 needs the new phase in the title while it is idle after a phase end. The designer and user should confirm all three |
| Clock moved back or changed while running | Remaining time jumps | Accepted: the wall clock is the source of truth (E4). An `endAt` absurdly far in the future counts as invalid on restore |
| Global scope with classic scripts | Name clashes, wrong script order | One namespace `Pomodoro`, fixed order in `index.html` (ARCHITECTURE "Conventions") |

## Rejected alternatives
- Decrementing a counter every second. It drifts under throttling and sleep, and it cannot survive a reload (AC5, AC18).
- One localStorage key for everything. One corrupt value would wipe settings and count together (against AC22), and every tick-free change would fire a bigger `storage` event.
- A `BroadcastChannel` or a leader-election tab for E5. The `storage` event plus the `lastCountedEndAt` guard is enough at this size.
- A Service Worker for background alerts. It does not keep timers alive reliably, it needs `http(s)` (not `file://`), and it adds a lifecycle to debug.
- An `<audio>` file for the beep. An oscillator needs no asset and no fetch on `file://`.
- `<input type="number">`. It accepts `1.5` and `e`; DESIGN.md "Number field" already decides text with `inputmode`.

## Implementation plan
| Step | What | Files | Depends on | ACs |
|---|---|---|---|---|
| 1 | Core state machine, validation, formatting, restore/adopt, with unit tests using an injected `nowMs` and `process.env.TZ = "UTC"` set at the top of the test file. Add `package.json` with the `test` script | `src/core.js`, `tests/core.test.js`, `package.json` | – | AC1-AC9, AC12-AC14, AC16-AC22, E4, E5 (guard), E7, E8 |
| 2 | Storage with the versioned prefixed keys, validation to `null`, memory fallback, write-only-changed, with unit tests on a fake backend (including one that throws) | `src/storage.js`, `tests/storage.test.js` | – (contract above) | AC16, AC22, E6 |
| 3 | Page shell and styles: markup hooks listed above, all DESIGN.md tokens, `data-phase` remap, dark mode, reduced motion, dialog layout | `index.html`, `styles.css` | – | AC1, AC15 (static parts) |
| 4 | Alerts adapter: audio unlock and beep, title, notification support, permission and notify | `src/alerts.js` | – | AC10, AC11, E2, E3 |
| 5 | App wiring: boot (`storage.load` → `core.restore` → render before first paint), handlers, render, 250 ms interval plus the one-shot end timeout, `visibilitychange`, `storage` event, effects to alerts, banner, live region | `src/app.js` | 1, 2, 3, 4 | AC2-AC22, E1-E7 (end to end) |
| 6 | Optional browser tests: Playwright with `page.clock` for start and countdown, background elapsed time, phase-end title, reload resume (running, paused, ended), corrupt storage. Add the devDependency and the `e2e` script | `e2e/pomodoro.spec.js`, `playwright.config.js`, `package.json` | 5 | AC2, AC5, AC10, AC18-AC22 |

Parallel: steps **1, 2, 3 and 4 touch disjoint files** and can run at the same time; step 1 alone creates `package.json`. Step 5 waits for all four. Step 6 runs after 5, and step 6 is the only one that edits `package.json` after step 1.

<!-- team-pm turns these steps into tickets in .team/TASKS.md. -->
