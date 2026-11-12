# Bugs that slip past green test suites

Each row: **symptom** the user sees → **how to catch it in the live preview** → **usual cause**. Sections B–P are written with web examples but apply to every product with a UI (read "console" as the platform's log, "viewport" as the device/window/terminal size); sections M, K, C, V are platform-specific. Sweep the sections that match the product and the diff and list the IDs you checked in the handoff. Add a row whenever a bug escapes to the user (report it in "Open items" so the plugin maintainer adds it).

## B — Build, environment, config

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| B-01 | Works in `dev`, blank page or 404 assets after `build` | run the production build + `preview`/`start`, not only `dev` | wrong `base`/`publicPath`/`assetPrefix`, case-sensitive import paths (works on macOS, breaks on Linux CI) |
| B-02 | Blank page, console `undefined` reading config | console listener; check every `import.meta.env.*` / `process.env.*` the diff adds | env var not prefixed (`VITE_`, `NEXT_PUBLIC_`, `REACT_APP_`), missing from `.env.example`, read at build time but set at runtime |
| B-03 | Every API call fails with CORS or connection refused | `requestfailed` listener on first load | API base URL hard-coded to another port/host, missing dev proxy, backend not started by the run command |
| B-04 | Hydration warning / content flashes then changes | console warnings on SSR pages, reload twice | `Date.now()`, `Math.random()`, `window`/`localStorage` read during server render, locale differs server vs client |
| B-05 | Old UI after deploy, new code "not working" | reload with cache; check hashed file names in build output | service worker / CDN caching `index.html`, no content hash on bundles |
| B-06 | Feature works locally, fails in container | start via the compose/Docker command when the project has one | missing file in `.dockerignore`d context, different Node/Python version, env var not passed into the container |
| B-07 | Strict-mode double effects: duplicate requests, double toasts | count requests per action in the network log | side effects in render or effects without cleanup |

## D — Data and API contract

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| D-01 | Page crashes on first use with an empty account | empty database / empty API response run | code assumes `items[0]`, `.map` on `undefined`, no empty state |
| D-02 | "undefined", "NaN", "[object Object]", "null" rendered | read every screenshot text; search page text for those words | field renamed on one side of the contract, optional field rendered without fallback |
| D-03 | List shows 20 items forever / duplicates on page 2 | seed > 1 page, click next/last, scroll infinite list to the end | off-by-one page index (0 vs 1), unstable sort without tie-breaker |
| D-04 | Spinner never stops | force API 500 and offline (`page.route` abort) | `finally` missing, error path doesn't reset loading flag |
| D-05 | Error shows raw JSON / stack trace / generic "Something went wrong" with no way forward | force 400, 401, 403, 404, 409, 422, 500 | error shape mismatch, no mapping to user-facing message + retry |
| D-06 | Saved data doesn't appear until manual reload | create/edit/delete then check the list without reloading | cache not invalidated / optimistic update not reconciled |
| D-07 | Numbers, money, decimals wrong | enter `0`, negative, `1,5` vs `1.5`, very large values | float math for money, locale parsing, string concatenation instead of sum |
| D-08 | Large list freezes the page | seed 1 000+ rows | no pagination/virtualization, N+1 requests per row |

## S — State and concurrency

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| S-01 | Double submit creates two records | double-click the submit button quickly; press Enter twice | button not disabled while pending, no idempotency |
| S-02 | Results of an old search replace the new one | type fast in a search box with API delay | no request cancellation / stale response check |
| S-03 | State leaks between users or tabs | log out → log in as another test user; open two tabs | global store not reset on logout, cache keyed without user id |
| S-04 | Form loses input on navigation or error | fill form, trigger validation error, go back/forward | state kept in unmounted component, form reset on failed submit |
| S-05 | Modal/drawer stays open or opens twice after route change | open dialog, use browser back | dialog state not tied to route / not closed on unmount |

## F — Forms and input

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| F-01 | Can submit invalid data, or server rejects with no field message | submit empty, too long, wrong format, script tags | validation only client-side or only server-side, server errors not mapped to fields |
| F-02 | Error message appears far from the field / not announced | screenshot after invalid submit at 375 px; check `aria-invalid`, `aria-describedby` | errors shown only in a toast |
| F-03 | Wrong keyboard on mobile, autofill breaks layout | inspect `type`, `inputmode`, `autocomplete` attributes | `type="text"` for email/phone/number |
| F-04 | Paste/whitespace/unicode breaks input | paste text with leading/trailing spaces, emoji, Vietnamese diacritics (`Nguyễn Thị Ánh`) | no trim/normalization, length counted in bytes |
| F-05 | Unsaved changes lost silently | edit, then navigate away / close tab | no dirty-state guard where data entry is long |
| F-06 | File upload fails for big or odd files | upload 0-byte, large, wrong type, name with spaces/unicode | size limit not shown, MIME check missing, filename not encoded |

## N — Navigation and routing

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| N-01 | 404 when reloading or opening a deep link | reload on every new route; open it in a fresh page | SPA fallback missing on the server/preview, route not registered |
| N-02 | Back button goes to the wrong place / exits the app | navigate 3 steps then back 3 times | `replace` vs `push` misuse, state in memory instead of URL |
| N-03 | Filters/tabs/pagination lost on reload or share | apply filter, reload, copy URL to a new page | UI state not reflected in query string |
| N-04 | Auth redirect loop / flash of protected page | open a protected route logged out, then log in; expire the session | guard runs after render, redirect target not preserved |
| N-05 | Active nav item wrong; page title stale | check nav highlight and `document.title` per route | title not set per route, exact vs prefix match |

## L — Layout and visual

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| L-01 | Horizontal scroll / clipped content on phone | 375 px screenshot; `document.documentElement.scrollWidth > innerWidth` | fixed widths, long unbreakable strings, tables without overflow container |
| L-02 | Text overlaps or truncates without tooltip | long names, long translations, 200 % zoom | fixed heights, `white-space: nowrap` without ellipsis + title |
| L-03 | Dialog/dropdown hidden behind header or cut off | open every overlay at 375 and 1280, near the viewport edge | z-index stacking context, `overflow: hidden` parent, no portal |
| L-04 | Sticky header covers anchor targets / first field | jump to anchors, focus first invalid field | missing `scroll-margin-top` |
| L-05 | Layout shift when data/images load | screenshot during loading and after | no reserved size for images, skeletons with different size than content |
| L-06 | Dark mode unreadable (dark text on dark) | toggle theme / `colorScheme: 'dark'` | hard-coded colors instead of tokens |
| L-07 | Touch targets too small, controls glued together on mobile | 375 px screenshot; target < 44×44 px | desktop-only spacing |
| L-08 | Icons/images missing or broken | `requestfailed` on images/fonts; screenshot | wrong path after build, case mismatch, CSP |

## A — Accessibility

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| A-01 | Can't reach or operate a control by keyboard | Tab through the whole screen; Enter/Space/Esc | `div` with `onClick`, focus trapped or lost after dialog closes |
| A-02 | Focus invisible | screenshot while tabbing | `outline: none` without replacement |
| A-03 | Low contrast text, placeholder used as label | check contrast of body/secondary text (≥ 4.5:1) | light gray on white, label missing |
| A-04 | Icon buttons announced as "button" | `getByRole('button', { name })` fails for icon-only buttons | missing `aria-label` |
| A-05 | Status changes not announced (toasts, inline errors) | check `role="status"`/`alert` or `aria-live` | visual-only feedback |

## I — i18n, dates, time

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| I-01 | Dates off by one day | run with `timezoneId` far from UTC (e.g. `Pacific/Kiritimati`, `America/Los_Angeles`); create near midnight | date-only values parsed as UTC, `toISOString().slice(0,10)` |
| I-02 | Mixed languages, raw keys like `home.title` | switch locale; search page text for dotted keys | missing translation key, fallback not configured |
| I-03 | Sorting/searching ignores diacritics or case | search "nguyen" for "Nguyễn" | no locale-aware compare / normalization |
| I-04 | Currency/number format wrong for the locale | view prices with `locale: 'vi-VN'` and `en-US` | manual formatting instead of `Intl` |

## U — Auth and permissions (with security)

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| U-01 | User sees buttons for actions they can't do, then gets 403 | log in as each seeded role | UI not reading permissions |
| U-02 | Hidden in UI but reachable by URL | open admin/other-user URLs directly as a normal user | authorization only on the client (hand to security) |
| U-03 | Session expiry loses work or loops | expire/delete the token mid-flow | no refresh/redirect with return URL |

## P — Performance felt by the user

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| P-01 | Slow first load | note load time in the runner; check bundle size in build output | huge dependency imported for one function, no code splitting |
| P-02 | Typing lags | type in search/filter with a large list | expensive render on every keystroke, no debounce |
| P-03 | Request waterfall | count sequential requests on page load | fetch in nested components instead of parallel |

## M — Mobile

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| M-01 | Works in debug, crashes or blank in release | preview a release build (`assembleRelease`, `flutter build apk --release`, Expo release) | ProGuard/R8 stripping classes, Hermes/minifier differences, dev-only polyfills, missing release env/config |
| M-02 | Keyboard covers the field or the submit button | fill every form on the small phone | no `KeyboardAvoidingView` / `windowSoftInputMode=adjustResize` / scroll on focus |
| M-03 | Content under notch, status bar or home indicator | screenshot on a notched device, both orientations | safe-area insets ignored |
| M-04 | State lost after backgrounding, rotation or process death | home → reopen; rotate mid-form; "Don't keep activities" | state not saved/restored, ViewModel/redux not persisted |
| M-05 | Hardware back exits the app or skips screens | press back on every screen (Android) | navigation stack misuse, back handler missing on modals |
| M-06 | Denied permission leaves a dead screen or a crash | deny / deny forever camera, location, notifications | permission result not handled, no settings link |
| M-07 | App hangs or shows nothing offline / on slow network | airplane mode, slow network profile | no timeout, no offline state, retry loop |
| M-08 | Text clipped or overlapping with large system font | font scale 1.3–2.0 | fixed heights, `allowFontScaling` assumptions |
| M-09 | "RenderFlex overflowed" / yellow-black stripes, layout broken on small phones | small phone screenshot, Flutter log | fixed widths, Row without Expanded/Flexible |
| M-10 | Deep link or push notification opens the wrong screen or a blank one | `adb shell am start -d …`, `xcrun simctl openurl`, `simctl push`, from cold start and from background | link handled only when the app is already running, auth guard order |
| M-11 | Images/assets missing on one platform | screenshot every changed screen on each platform | asset not declared (`pubspec.yaml`, iOS asset catalog), case-sensitive path |
| M-12 | ANR / jank on lists | scroll a long list, watch logcat for `ANR`, frame drops | work on the main/UI thread, unvirtualized list, images not resized |
| M-13 | Duplicate request or double navigation on fast taps | double-tap buttons | no debounce / pending state |
| M-14 | iOS-only or Android-only behaviour broken | run both when the environment allows, else report "not previewed" | platform-specific code path untested |

## K — Desktop

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| K-01 | Dev build works, packaged app fails to start | run the packaged binary | native module not rebuilt for the runtime, files missing from the package/asar, wrong resource paths |
| K-02 | Paths with spaces/unicode or on another drive break | open/save files under such paths | string-concatenated paths, URL vs file path confusion |
| K-03 | Second launch opens a second broken instance | start the app twice | missing single-instance lock, locked database file |
| K-04 | Unsaved work lost on close/quit | edit then close the window and quit from the menu/dock | no close guard, `beforeunload` not wired to the native close |
| K-05 | Layout broken at the minimum window size or on HiDPI | screenshot at the min size and at 150–200 % scale | fixed sizes, raster assets without @2x |
| K-06 | Shortcuts wrong on one OS (Ctrl vs Cmd) | try the documented shortcuts | hard-coded modifier |
| K-07 | Settings/data written to the install folder | check where files land; run without write access to the install dir | wrong app-data path |
| K-08 | Renderer can access what it shouldn't / crashes on IPC | renderer console errors on IPC calls | contextIsolation/IPC contract mismatch (hand security issues to security) |
| K-09 | App freezes during long work | trigger the long operation, check responsiveness | heavy work on the UI/main thread |

## C — CLI / TUI

| ID | Symptom | Catch it by | Usual cause |
|---|---|---|---|
| C-01 | Exit code 0 on failure (scripts continue after an error) | `echo $?` after every failure case | error printed but not returned |
| C-02 | Stack trace instead of a message | wrong flag, missing file, no network | uncaught exceptions at the top level |
| C-03 | Hangs in CI / pipes | run with stdin not a TTY (`</dev/null`, `\| cat`) | interactive prompt without TTY check |
| C-04 | Colors / spinner escape codes in piped output or logs | pipe to `cat -v`; `NO_COLOR=1` | no `isatty` check |
| C-05 | Data and diagnostics mixed on stdout; `--json` not parseable | `--json \| jq .` | logs written to stdout |
| C-06 | "Broken pipe" trace with `head` | `cmd \| head -1` | EPIPE/SIGPIPE not handled |
| C-07 | Works only from the repo root | run from another directory | paths relative to cwd instead of the binary/config |
| C-08 | First run on a clean machine fails | empty `HOME`/config dir | config assumed to exist, migration of old config missing |
| C-09 | `--dry-run` changes files; destructive command without confirmation | diff the file system before/after | flag not threaded through |
| C-10 | Ctrl+C leaves half-written files or a broken terminal | interrupt mid-operation; TUI: interrupt and check the terminal | no signal handling, no atomic writes, raw mode not restored |
| C-11 | Windows line endings / encodings break parsing | CRLF input, UTF-8 with BOM, non-ASCII file names | naive splitting/decoding |

## V — API / service / worker

| ID | Symptom (for the client) | Catch it by | Usual cause |
|---|---|---|---|
| V-01 | Client breaks after a "small" backend change | compare responses with the OpenAPI/schema and the frontend's types | renamed/removed field, null where a value was promised, changed date format |
| V-02 | 500 for a bad request | send invalid/missing/extra fields | validation missing, exceptions not mapped |
| V-03 | 200 with an error in the body (GraphQL / legacy APIs) | check the body, not only the status | error handling conventions |
| V-04 | Another user's data reachable | request a resource of another seeded user | missing ownership check (hand to security) |
| V-05 | Duplicate records on retry / double submit | send the same create twice, replay a webhook | no idempotency key / unique constraint |
| V-06 | Request hangs when a dependency is down | stop the cache/broker/stub container | no timeout, unbounded retry |
| V-07 | Works on an empty DB, slow or wrong on real volume | seeded realistic volume; watch query log | N+1 queries, missing index, unbounded result |
| V-08 | Pagination returns duplicates or skips | page through a list while sorting by a non-unique column | unstable ordering, offset with concurrent inserts |
| V-09 | Timezone shifts in stored or returned dates | create near midnight with a non-UTC client offset | naive datetimes, server-local time |
| V-10 | Worker message lost or processed twice | kill the worker mid-message; send a poison message | ack before processing, no dead-letter queue |
| V-11 | Works locally, fails in the container | run through compose / the Docker image | env var missing, host vs service name, file permissions |
| V-12 | Secrets or personal data in logs | read the service log of the whole run | logging full requests/headers |
| V-13 | CORS / cookie issues only for the browser client | call from the web app's origin, check `Access-Control-*` and `Set-Cookie` attributes | config differs per environment |
