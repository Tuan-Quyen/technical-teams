---
name: test-process
description: The QA engineer's full test process, adapted from ISTQB (planning, monitoring and control, analysis, design, implementation, execution, completion) and the STLC — risk-based test planning with entry/exit criteria, static review of acceptance criteria and design, test design techniques (equivalence partitioning, boundary values, decision tables, state transitions, exploratory charters), the quality characteristics to cover (ISO/IEC 25010:2023 — functional suitability, interaction capability/UX, compatibility, performance, reliability, security, maintainability, portability), UI/UX verification against the design and usability heuristics, defect reports with severity and priority, retest and regression, and the test summary report that backs the PASS/FAIL verdict. qa loads it for a deep test plan or UX check.
---

# test-process — QA is the gate for product quality

PASS = the product does what the spec says (**verification**), a real user can use it (**validation**), nothing that worked is broken (**regression**) — with evidence. Test as deep as the risk, no deeper: the profile below sets the depth, the references are optional detail.

Read on demand (paths under `${CLAUDE_PLUGIN_ROOT}/skills/test-process/references/`):

| File | When |
|---|---|
| `process.md` | writing the test plan (ISTQB activities → pipeline steps, outputs), full entry/exit and calibration rules |
| `techniques.md` | designing test cases (EP, BVA, decision table, state transition, pairwise, exploratory charters), levels and types |
| `quality-checklist.md` | choosing quality characteristics in scope (ISO/IEC 25010:2023) and depth by risk |
| `ux-verification.md` | verifying UI/UX: conformance to the frontend design, Nielsen heuristics, WCAG 2.2 AA, UX severity |
| `defects-and-reports.md` | defect report format, severity × priority, lifecycle, retest/regression, test summary |

## Profiles — pick one by actual risk, one line why

| Profile | Default for | Plan | Execution |
|---|---|---|---|
| **T0 Lightweight** | text, CSS, minor UI, low-risk fix (`--small`) | none: the brief's bullets are the checklist; no pre-check spawn (a fix still gets one: reproduce + define the regression test) | verify the changed behaviour · relevant existing tests · basic smoke when applicable. No RTM, no mandatory exploratory, no full regression suite |
| **T1 Standard** | normal feature, CRUD, form, API, business logic, most fixes | pre-check: lightweight RTM checklist (condition → AC → test) | all relevant ACs · happy + important negative paths · relevant integration points · targeted regression · exploratory only when the risk justifies it |
| **T2 Comprehensive** | auth, authorization, payments, migrations, data integrity, high-risk architecture | pre-check: full test plan + RTM (`references/process.md`) | integration + E2E · boundaries and edge cases (`references/techniques.md`) · risk-based exploratory · expanded regression · security, performance, compatibility when applicable (`references/quality-checklist.md`) |

- The task-type defaults are a starting point, not a rule; never pick T2 just to be safe — name the risk that needs it.
- The profile is fixed at pre-check approval (no pre-check: at execution round 1). Changing it — wider or narrower — needs the lead's approval with the risk named: return `needs-input`. The workflow stops a run whose qa result names another profile.
- UI in scope at T1/T2 → `references/ux-verification.md` for the changed screens only.
- Each run returns a short `report` with the minimum its profile and mode require (run-kit §3 *qa report minimum*): why this profile, planned scope, executed scope, deviations, and the profile's evidence lines. A missing line stops the run; a declared line is not proof that the test ran, so write only what you ran.
- Retest scope: fixed findings · targeted regression around changed or impacted areas · related automated tests. Exploratory or any wider scope only after the lead approves it, with the risk named.

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

## Rounds

| Round | Do |
|---|---|
| R0 pre-check | profile, scope, plan at the profile's depth, spec issues; no test runs (fix: reproduce + define the regression test) |
| R1 initial | the approved scope at the profile's depth; planned exploratory only; every reproducible finding with evidence |
| R ≥ 2 targeted | retest every fixed finding · regression around changed code and affected flows · re-run related automated tests · no exploratory of unchanged areas · a known defect keeps its ID (`reopened`), never a new one · a new finding only from a new change, a regression, a fix or a missed in-scope defect |
| cap | at most **3 QA-Fix rounds per item**. A round = one developer fix cycle started by an actionable qa FAIL; the first qa run is round 0, its retest stays in the same round. The count lives in STATE.md § QA-Fix state; qa first reports the round qa.md line 1 showed, then writes the round it is given, never its own. At the cap the item stops `BLOCKED_PENDING_USER_DECISION` until the user decides in the top-level session; an approved round runs inline (run-kit §3). Never a PASS because the cap was hit |

## Severity and blocking

| Severity | Blocks a PASS |
|---|---|
| blocker, critical | always, when its basis is in scope |
| major | only when it violates an AC or agreed quality requirement **with** demonstrated user impact (`blocking: true`) |
| minor | no — listed; the lead fixes or defers |
| trivial / cosmetic | no |
| enhancement | not a defect — backlog |

A blocking finding carries all of: **steps · expected · actual · evidence · violates** (AC or criterion) **· impact** (concrete user impact) **· why** (severity justification). Missing any → it does not block (the workflow moves it to `invalid`; inline, the lead sends it back to qa). No speculative findings: no reproduction, no finding. Subjective preference is never a defect. Unsure between two levels → the lower one, with the reason.

**Lifecycle** — every finding has one bug ID in the item's tracker (`.team/reports/<slug>/findings.md`), given once and kept when its title, file or line changes: `OPEN → IN_PROGRESS → FIXED_PENDING_RETEST → VERIFIED`, or `REOPENED` (same bug ID); `DEFERRED` and `REJECTED` only by the lead; `VERIFIED` only after a fix. A blocker stays blocking until verified or the lead decides, even if a later report lowers its severity. Re-check a known finding by its bug ID (verified / failing); never report it again as new. A finding that only looks like a known one is a duplicate candidate, decided by behaviour and evidence, never merged on metadata. A severity outside these five, or a blocking claim missing a field → invalid: back to qa, the run never passes on it.

## Binding rules

| Rule | |
|---|---|
| Exit (PASS) | every approved condition executed at the profile's depth · no open in-scope blocking finding · regression green · live preview clean where in scope · no weakened/skipped test. Never lower it to reach a PASS |
| Ownership | unit/component tests = developer (qa reports missing ones as findings, never writes them) · integration/E2E/acceptance = qa · one owner per test, no duplicates |
| Spec issues | an ambiguous, missing or contradictory AC → blocking finding owned by ba, designer or architect; expected behaviour is never invented; no build until resolved or accepted by the user |
| Independence | expected results from spec/frontend design/docs/conventions, never from current behaviour |
| Usability | spec-compliant but unusable = defect; caused by the design → escalate as a design question |
| Tool limits | name at plan time what the browser or emulator tool cannot do → cover it with unit or integration tests and mark the live check `not run`, never PASS |
| Hotfix | minimal critical verification; untested areas and residual risks listed in the report |

## Verdict

**PASS** · **FAIL** (blocking findings with severity, owner) · **PASS pending design decision** (UI/UX items for the designer only) · **`vướng` / `cần quyết định`** (entry criteria not met — name what is missing). Never PASS an unverified change.
