---
name: test-process
description: The QA engineer's full test process, adapted from ISTQB (planning, monitoring and control, analysis, design, implementation, execution, completion) and the STLC — risk-based test planning with entry/exit criteria, static review of acceptance criteria and design, test design techniques (equivalence partitioning, boundary values, decision tables, state transitions, exploratory charters), the quality characteristics to cover (ISO/IEC 25010:2023 — functional suitability, interaction capability/UX, compatibility, performance, reliability, security, maintainability, portability), UI/UX verification against the design and usability heuristics, defect reports with severity and priority, retest and regression, and the test summary report that backs the PASS/FAIL verdict. qa loads it for a deep test plan or UX check.
---

# test-process — QA is the gate for product quality

PASS = the product does what the spec says (**verification**), a real user can use it (**validation**), nothing that worked is broken (**regression**) — with evidence. Test as deep as the risk, no deeper: the item's tier sets the depth, the references are optional detail.

Read on demand (paths under `${CLAUDE_PLUGIN_ROOT}/skills/test-process/references/`):

| File | When |
|---|---|
| `process.md` | writing the test plan (ISTQB activities → pipeline steps, outputs), full entry/exit and calibration rules |
| `techniques.md` | designing test cases (EP, BVA, decision table, state transition, pairwise, exploratory charters), levels and types |
| `quality-checklist.md` | choosing quality characteristics in scope (ISO/IEC 25010:2023) and depth by risk |
| `ux-verification.md` | verifying UI/UX: conformance to the frontend design, Nielsen heuristics, WCAG 2.2 AA, UX severity |
| `defects-and-reports.md` | defect report format, severity × priority, lifecycle, retest/regression, test summary |

## Tiers — the item's `tier`, set by the lead

| Tier | Default for | Plan | Execution |
|---|---|---|---|
| **T0 Lightweight** | text, CSS, minor UI, low-risk fix (`--small`) | none: the brief's bullets are the checklist; no pre-check spawn (a fix still gets one: reproduce + regression test) | the changed behaviour · relevant existing tests · basic smoke. No RTM, no mandatory exploratory, no full regression suite |
| **T1 Standard** | normal feature, CRUD, form, API, business logic, most fixes | pre-check: AC → check list, in the structured output | all relevant ACs · happy + important negative paths · integration points · targeted regression · exploratory only when the risk justifies it |
| **T2 Comprehensive** | auth, authorization, payment processing (charging, refunds), migrations, deleting or rewriting stored data, high-risk architecture (calculation logic that tests cover stays T1) | pre-check: full test plan + RTM in `reports/<slug>/qa.md` (`references/process.md`) | integration + E2E · boundaries and edges (`references/techniques.md`) · risk-based exploratory · expanded regression · security, performance, compatibility when applicable (`references/quality-checklist.md`) |

- Only T2 writes a report file; below T2 the verdict, findings and `notRun` go in the structured output only.
- The tier is fixed; the risk says another one → `needs-input` with the risk named, never on your own.
- UI in scope at T1/T2 → `references/ux-verification.md` for the changed screens only.
- Retest scope: the listed findings · targeted regression around changed areas · related automated tests. Wider only after the lead approves it.

## Scope lock — the verification target

Fixed at pre-check approval: approved ACs · test scope in/out · platforms and environments · required conditions · exit criteria. Later rounds verify that target; no new requirements, preferences or enhancements.

A finding is added, and may block, only when its **basis** is one of:

| Basis | Means |
|---|---|
| `ac-violation` | breaks an approved AC, edge case or designed state |
| `regression` | in-scope behaviour that worked before this change is broken |
| `fix-caused` | caused by a developer fix in this item |
| `critical-risk` | a genuine critical risk directly caused by this change |

Anything else is recorded apart and never blocks: `pre-existing` (a new work item; a pre-existing blocker/critical is named to the user), `enhancement` (backlog), `out-of-scope` (observation).

## Runs

| Run | Do |
|---|---|
| pre-check | scope and plan at the tier's depth, spec issues; no test runs (fix: reproduce + write the regression test) |
| execution | the approved scope at the tier's depth; planned exploratory only; every reproducible finding as a failing test |
| retest | only the listed findings + the suite · no exploratory of unchanged areas · a known defect keeps its ID, never a new one · a new finding only for a regression the fix caused |
| cap | one `round` counter in the item for every fix batch (review or qa), cap 3, in code. At the cap with blockers left the item is blocked until the user decides in the top-level session (run-kit qa-loop.md). Never a PASS because the cap was hit |

## Severity and blocking

| Severity | Blocks a PASS |
|---|---|
| blocker, critical | always, when its basis is in scope |
| major | only when it violates an AC or agreed quality requirement **with** demonstrated user impact (`blocking: true`) |
| minor | no — listed; the lead fixes or defers |
| trivial / cosmetic | no |
| enhancement | not a defect — backlog |

A finding is a failing test (`path::name`) or a one-line repro command, a title ≤ 8 words, the AC it breaks and ≤ 40 words of detail — no report prose. A blocking finding without a test does not block. No speculative findings: no reproduction, no finding. Subjective preference is never a defect. Unsure between two levels → the lower one, with the reason.

**Lifecycle** — findings live in `.team/items/<slug>.json` as `F1`, `F2`… (elsewhere `CART#F3`), given once, kept when title, file or line change: `open → fixed → verified`, or `reopened` when a retest fails; `challenged` once by the fixer with evidence, then `rejected` (you concede, or the arbiter refutes) or back to `open` (upheld); otherwise `deferred`, `rejected` only by the lead on the user's word. A finding reopened twice stalls the loop for the user. Re-check a known finding by its ID (verified / failing); never report it again as new.

## Binding rules

| Rule | |
|---|---|
| Exit (PASS) | every approved condition executed at the tier's depth · no open in-scope blocking finding · regression green · live preview clean where in scope · no weakened/skipped test. Never lower it to reach a PASS |
| Ownership | unit/component tests = developer (qa reports missing ones as findings, never writes them) · integration/E2E/acceptance = qa · one owner per test, no duplicates |
| Spec issues | an ambiguous, missing or contradictory AC → blocking finding owned by ba, designer or architect; expected behaviour is never invented; no build until resolved or accepted by the user |
| Independence | expected results from spec/frontend design/docs/conventions, never from current behaviour |
| Usability | spec-compliant but unusable = defect; caused by the design → escalate as a design question |
| Tool limits | name at plan time what the browser or emulator tool cannot do → cover it with unit or integration tests and mark the live check `not run`, never PASS |
| Hotfix | minimal critical verification; untested areas and residual risks listed in the report |

## Verdict

**PASS** · **FAIL** (blocking findings with severity, owner) · **PASS pending design decision** (UI/UX items for the designer only) · **`vướng` / `cần quyết định`** (entry criteria not met — name what is missing). Never PASS an unverified change.
