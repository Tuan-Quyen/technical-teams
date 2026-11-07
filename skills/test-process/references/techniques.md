# Test design techniques, levels and types

Pick techniques by what the test condition is about; combine them for high-risk areas. Expected results always come from the spec, design or conventions.

## Black-box (specification-based)

| Technique | Use when | How | Example |
|---|---|---|---|
| Equivalence partitioning (EP) | an input/output has groups the system treats the same | one test per valid partition and per invalid partition; never combine two invalid partitions in one test | quantity: invalid < 1 · valid 1–99 · invalid > 99 · invalid non-number |
| Boundary value analysis (BVA) | ordered partitions (numbers, lengths, dates, sizes, counts) | 2-value: each boundary and its nearest neighbour outside; 3-value for high risk: boundary and both neighbours | name max 50 chars → 49, 50, 51; page size 1 and max; date at month end, leap day, DST change |
| Decision table | combinations of conditions decide the outcome (business rules, permissions, pricing) | list conditions and actions, one column per combination that matters; collapse irrelevant ones | discount = member? × coupon? × order ≥ X |
| State transition | the object has states and events (orders, bookings, auth session, wizard, upload) | draw states/transitions; cover every valid transition, then invalid ones (event in a state where it should be rejected) | draft → submitted → approved / rejected; "approve" on a rejected item must fail |
| Use-case / flow testing | end-to-end user tasks | main flow, every alternative and exception flow (cancel, back, error, timeout) | checkout with saved card, new card, declined card, back from payment |
| Pairwise (all-pairs) | many independent parameters (platforms × locales × roles × settings) | cover every pair of values instead of every combination | 3 browsers × 3 locales × 2 themes × 3 roles → ~10 runs instead of 54 |
| Syntax / format | structured input (email, phone, IDs, files, JSON) | valid forms, each rule broken once, empty, whitespace, unicode, injection-like strings | `a@b.co`, `a@b`, ` a@b.co `, `Nguyễn@x.vn`, `<script>` |

## Experience-based

| Technique | How |
|---|---|
| Error guessing | list likely mistakes from the defect history and the `live-preview` catalogue (`common-bugs.md`) for this area; test each |
| Exploratory testing | **session-based**: a charter ("Explore *<area>* with *<resources/data>* to discover *<risk>*"), time box (30–60 min of agent effort), notes of what was tried, defects, questions, coverage gaps. At least one session per work item with UI or complex logic; more for high risk. Use the heuristics below to vary |
| Checklist-based | the quality checklist and the UX verification checklist in this skill |

Exploratory variation heuristics: **CRUD** every object; **follow the data** (create → see it everywhere it should appear → edit → delete → gone everywhere); **interrupt** (back, reload, close, offline, kill app, Ctrl+C); **zero / one / many / too many**; **beginning / middle / end** (first item, last page, end of list); **starve and flood** (empty fields, huge inputs, slow network); **personas** (first-time user, power user with keyboard, user with screen reader, user on a small phone, user in another language/time zone, user with limited permissions); **sequence** (do steps in a different order, twice, in parallel tabs/devices).

## White-box (with the developer's code)

| Technique | Use when |
|---|---|
| Statement / branch coverage | check the project's coverage report on the changed files; uncovered branches in changed code = missing tests (add them or explain) |
| Path through error handling | every `catch` / error branch in the diff has a test that reaches it |

## Test levels

| Level | Covers | Owner here |
|---|---|---|
| Unit / component | functions, components in isolation | existing tests + what the developer ran; qa adds what the ACs need |
| Integration | modules together, API ↔ DB, client ↔ API contract | qa |
| System / end-to-end | the whole running product through its real interface (`live-preview`) | qa |
| Acceptance | does it meet the user's need — ACs + UX validation; UAT is the user's at G1 / Mk / RELEASE | qa prepares the evidence; the user accepts |

## Test types (choose per risk)

| Type | When |
|---|---|
| Smoke | first thing every round: product starts, main flow works; failure = stop and report |
| Confirmation (retest) | every defect marked fixed |
| Regression | the area around every change, and the full relevant suite before PASS; `release`: full suite |
| Functional | every AC, edge case, business rule |
| Non-functional | per `quality-checklist.md`: UX/accessibility, compatibility, performance, reliability, security basics, i18n, installability/upgrade |
| Data / migration | with dba: data before and after, rollback, large volume |
| Documentation | README / help steps actually work as written |
