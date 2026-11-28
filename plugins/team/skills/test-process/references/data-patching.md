# Data patching — reach a hard UI state without re-running the flow

> Used by: qa, developer, debugger · Read when: a live check or repro needs a state that is slow or impossible to reach (empty, error, edge data, rare status)

## Order of preference

1. **Network layer, no code change**: Playwright `page.route`, an MSW handler, a proxy.
2. **The app's own dev-only override**: env flag, fixture file, mock mode.
3. **Only if neither**: a temporary patch at the fetch/response boundary. Never patch business logic or state stores.

State reachable with seeded test data → use the seed. Unit tests → fake at the boundary as in `development-process/references/implementation.md`. Neither needs this.

## Mark and roll back (option 3)

- Every patched line carries the comment `TEAM-TEMP-PATCH` (any comment syntax).
- Roll back by removing exactly the marked lines or hunks. Find them with `git grep -n TEAM-TEMP-PATCH` and `git diff`.
- Never `git checkout` / `git restore` a whole file: it wipes real changes.
- Before the Handoff `git grep -n TEAM-TEMP-PATCH` prints nothing. The guard hook refuses a hand-back while marked lines remain.

## Evidence

- A check run on patched data is labelled `patched data at <boundary>` in Evidence.
- Run at least one check of the same flow on the real path, or list it under assumptions / known limits.
- A PASS resting only on patched data is not a PASS for the integration.

## Debugger

No `Edit`: use option 1 only. Otherwise ask for the patch under Next, naming the boundary and the data.
