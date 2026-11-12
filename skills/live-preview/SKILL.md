---
name: live-preview
description: Verify a change in the running product, the way its user meets it, not only through unit tests — for every kind of app (web, mobile iOS/Android/React Native/Flutter, desktop Electron/Tauri/native, CLI/TUI, API/backend service, worker/bot, browser extension, game). Build and start the real artifact, drive every acceptance criterion through its real interface with the platform's driver (Playwright, Maestro/Detox/Espresso/XCUITest, Playwright-Electron/WebDriver, a shell/pty harness, HTTP client), capture crashes, error logs and failed calls, screenshots or transcripts on the required form factors, edge states, then stop it. Includes a per-platform catalogue of bugs that slip past green suites. Preloaded into qa; developer (self-check) and designer load it when needed.
---

# live-preview — "the tests pass" is not "the product works"

Run the **real artifact** and drive every AC through the **interface its user uses**. Required for any change a user or client can observe; "n/a" only with a reason (refactor without observable change, test/docs only, library without consumer).

Read on demand (paths under `${CLAUDE_PLUGIN_ROOT}/skills/live-preview/references/`):

| Product | Driver (prefer what the project has) | Reference |
|---|---|---|
| Web, PWA, browser extension | Playwright / Cypress | `web.md` |
| Mobile (RN, Expo, Flutter, native, Capacitor) | Maestro, Detox, `integration_test`, Espresso, XCUITest on emulator/simulator | `mobile.md` |
| Desktop (Electron, Tauri, Qt, .NET, AppKit, JavaFX), games | Playwright `_electron`, WebDriver, toolkit UI tests; `xvfb-run` headless | `desktop.md` |
| CLI / TUI | transcript harness (args, stdin, exit code), pty for TUIs | `cli.md` |
| API, service, worker, bot | HTTP/gRPC/queue clients against the service with real dependencies | `service.md` |
| Prerequisites, full pass, evidence details | — | `pass.md` |
| Known bugs per area and platform (B, D, S, F, N, L, A, I, U, P, M, K, C, V) | — | `common-bugs.md` |

## The pass

| # | Step |
|---|---|
| 1 | build + start the build closest to what users get, in the background (`run_in_background`, never a foreground server) |
| 2 | wait for a real ready signal; startup error = finding |
| 3 | scripted check per AC in the project's e2e folder (kept as regression test), using what the user perceives (labels, real args, real requests) |
| 4 | collect the platform's error channels (console/page errors, logcat, crash dumps, stderr + exit code, service log); any error on the changed path = FAIL unless the brief lists it as known |
| 5 | form factors · states (empty, loading, error/offline, long content) · input (keyboard, touch/back, pipes/bad args, malformed/unauthorized requests) · lifecycle (reload/deep link, background/relaunch, quit/reopen, retry) |
| 6 | inspect every screenshot/transcript yourself (Read shows images) against `.team/DESIGN.md` and `common-bugs.md` |
| 7 | stop everything you started |

## Rules

| Rule | |
|---|---|
| Missing driver/runtime | never install it yourself (dependencies are the developer's, runtimes and emulators the user's) → `cần quyết định` naming exactly what is needed; not a PASS |
| Platform not hostable here | preview what can run, list what was **not previewed**; a web build never replaces a mobile preview |
| Evidence in the handoff | product + target · commands · runner summary · errors (count + first lines) · form factors → result + file · states/input/lifecycle → ok/issue/n/a · not previewed · known-bug IDs swept |
| Safety | local/emulator/sandbox only, test credentials only, no secrets in specs or screenshots, outputs under `test-results/` (never `.team/`, never committed) |
| No weakening | no sleeps to hide races, no filtering errors out of logs |
