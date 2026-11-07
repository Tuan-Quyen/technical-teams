# Bugs that slip past green test suites

Each row: **symptom** the user sees → **how to catch it in the live preview** → **usual cause**. Sweep the categories that match the diff and list the IDs you checked in the handoff. Add a row whenever a bug escapes to the user (report it in "Còn mở" so the plugin maintainer adds it).

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
