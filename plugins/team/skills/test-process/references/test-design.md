# Test design — techniques, levels, quality characteristics, risk

> Used by: qa · Read when: designing test cases or choosing what quality to cover

Pick techniques by what the test condition is about; combine them where risk is high. Expected results come from the spec, design or conventions, never from current behaviour.

## Techniques

| Technique | Use when | How |
|---|---|---|
| Equivalence partitioning | groups of input the system treats the same | one test per valid and per invalid partition; never two invalid partitions in one test |
| Boundary values | ordered input (numbers, lengths, dates, counts) | each boundary and its nearest outside neighbour; both neighbours at high risk (max 50 chars → 49, 50, 51; month end, leap day, DST) |
| Decision table | combinations of conditions decide the outcome (rules, permissions, pricing) | one column per combination that matters; collapse irrelevant ones |
| State transition | states and events (orders, sessions, wizards, uploads) | every valid transition, then invalid ones ("approve" on a rejected item must fail) |
| Flow testing | end-to-end user tasks | main flow plus each alternative and exception (cancel, back, error, timeout) |
| Pairwise | many independent parameters (platforms × locales × roles) | cover every pair of values, not every combination |
| Syntax / format | structured input (email, IDs, files, JSON) | valid forms, each rule broken once, empty, whitespace, unicode, injection-like strings |
| Error guessing | an area with defect history | list the likely mistakes; test each |
| Coverage (white-box) | changed code | uncovered branches or untested error paths in the diff → a finding for developer |

**Exploratory** — a charter ("explore *area* with *data* to find *risk*"), time-boxed, with notes of what was tried. Vary with: CRUD every object · follow the data everywhere it shows · interrupt (back, reload, offline, kill) · zero / one / many / too many · first / last / end of list · empty and huge input, slow network · personas (first-time, keyboard-only, screen reader, small phone, other locale, limited permissions) · other order, twice, parallel tabs.

## Levels and types

| Level | Owner |
|---|---|
| unit / component | developer; a missing one is a finding for developer, never written by qa |
| integration (modules, API ↔ DB, client ↔ API contract) · system / E2E through the real interface | qa |
| acceptance (ACs + UX validation) | qa prepares the evidence; the user accepts |

Types per risk: **smoke** first every round (fails → stop and report) · **retest** every fixed finding · **regression** around every change, the relevant suite before PASS, the full suite at `release` · **functional** every AC and edge case · **non-functional** per the table below · **data / migration** with dba (before/after, rollback, volume) · **docs** (README steps work as written).

## Quality characteristics (ISO/IEC 25010:2023)

Mark each **in scope** (with the risk), **light** (smoke) or **out** (with the reason). Functional suitability and interaction capability are in scope for every observable change.

| Characteristic | What qa checks | Partner |
|---|---|---|
| Functional suitability | every AC and edge case; results correct (calculations, rounding, dates); it serves the user's goal | ba |
| Interaction capability (UX, accessibility) | `ux-verification.md` | designer |
| Compatibility | every in-scope platform, browser, device, form factor; the systems it talks to | devops |
| Performance | changed flows on realistic data; no N+1 or request waterfalls; large lists | dba, devops |
| Reliability | dependency down or slow, offline, retry, crash recovery, no corruption on interruption, idempotency | devops |
| Security | basics only (another user's data, input abuse, secrets in UI or logs), then hand to security | security |
| Maintainability | testability: what could not be tested and why | code-reviewer |
| Flexibility | install, upgrade, migrations on existing data, clean-machine config | devops, dba |
| Safety | products that can cause physical or financial harm: confirmations, safe defaults | ba |

## Risk → depth

Impact (money, personal data, auth, deletion, core flow) × likelihood (new or complex code, concurrency, past defects, new library) × exposure (most-used screens, first run). High × high → several techniques, an exploratory session, every platform. Low × low → smoke + regression. Write the ranking in the test plan, so everyone sees what was tested less.
