---
name: test-process
description: "The QA engineer's test process (from ISTQB and ISO/IEC 25010): risk-based planning, test design techniques, UI/UX verification, defect reports with severity and priority, retest and regression, the summary behind PASS/FAIL. qa loads it for a deep test plan or UX check."
---

# test-process — QA is the gate for product quality

PASS = the product does what the spec says (**verification**), a real user can use it (**validation**), nothing that worked is broken (**regression**) — with evidence.

## When to load

qa, for a T2 test plan, a deep execution run or a UX check. `team-qa` holds the everyday rules; this skill holds the method and its bar.

## Principles

### 1. Expected results come from a source

**Never from current behaviour, never invented.**

- Expected results come from the spec, frontend design, docs or platform conventions.
- An ambiguous, missing or contradictory AC → a blocking spec-issue finding owned by ba, designer or architect; no build until it is resolved or accepted by the user.
- Spec-compliant but unusable is a defect; caused by the design → escalate it as a design question.

Test: can you cite the line each expected result comes from?

### 2. Test as deep as the risk, no deeper

**The item's tier sets the depth; the references are optional detail.**

- The tier is fixed; the risk says another one → `needs-input` with the risk named, never on your own.
- Hotfix: minimal critical verification; untested areas and residual risks listed in the report.

Test: is every deep check backed by a named risk?

### 3. Scope lock

**Later rounds verify the approved target; no new requirements.**

- Fixed at pre-check approval: approved ACs · test scope in/out · platforms and environments · required conditions · exit criteria.
- A finding may block only when its **basis** is `ac-violation` (breaks an approved AC, edge case or designed state), `regression` (in-scope behaviour that worked before is broken), `fix-caused` (caused by a developer fix in this item) or `critical-risk` (a genuine critical risk this change causes).
- Anything else is recorded apart and never blocks: `pre-existing` (a new work item; a pre-existing blocker/critical is named to the user), `enhancement` (backlog), `out-of-scope` (observation).
- Ownership: unit/component tests = developer (missing ones are findings, never written by qa) · integration/E2E/acceptance = qa · one owner per test, no duplicates.

Test: does each blocking finding name its basis?

### 4. A finding is a failing test

**No reproduction, no finding.**

- A failing test (`path::name`) or a one-line repro command, a title ≤8 words, the AC it breaks and ≤40 words of detail — no report prose. A blocking finding without a test does not block.
- Subjective preference is never a defect. Unsure between two severities → the lower one, with the reason.
- Tool limits: name at plan time what the browser or emulator tool cannot do → cover it with unit or integration tests and mark the live check `not run`, never PASS.

Test: could the developer run each finding and see it fail?

## Method

### Tiers — the item's `tier`, set by the orchestrator

| Tier | Default for | Plan | Execution |
|---|---|---|---|
| **T0 Lightweight** | text, CSS, minor UI, low-risk fix (`--small`) | none: the brief's bullets are the checklist; no pre-check spawn (a fix still gets one: reproduce + regression test) | the changed behaviour · relevant existing tests · basic smoke. No RTM, no mandatory exploratory, no full regression suite |
| **T1 Standard** | normal feature, CRUD, form, API, business logic, most fixes | pre-check: AC → check list, in the structured output | all relevant ACs · happy + important negative paths · integration points · targeted regression · exploratory only when the risk justifies it |
| **T2 Comprehensive** | auth, authorization, payment processing (charging, refunds), migrations, deleting or rewriting stored data, high-risk architecture (calculation logic that tests cover stays T1) | pre-check: full test plan + RTM in `reports/<slug>/qa.md` (§ T2 test plan) | integration + E2E · boundaries and edges · risk-based exploratory · expanded regression · security, performance, compatibility when applicable (`references/test-design.md`) |

- Only T2 writes a report file; below T2 the verdict, findings and `notRun` go in the structured output only.
- UI in scope at T1/T2 → `references/ux-verification.md` for the changed screens only.

### Runs

| Run | Do |
|---|---|
| pre-check | scope and plan at the tier's depth, spec issues; no test runs (fix: reproduce + write the regression test) |
| execution | the approved scope at the tier's depth; planned exploratory only; every reproducible finding as a failing test |
| retest | only the listed findings + the suite + targeted regression around changed areas (wider only with a stated risk) · no exploratory of unchanged areas · a known defect keeps its ID · a new finding only for a regression the fix caused |
| cap | one `round` counter in the item for every fix batch (review or qa), cap 3, in code. At the cap with blockers left the item is blocked until the user decides in the top-level session (run-kit qa-loop.md). Never a PASS because the cap was hit |

Lifecycle, IDs and challenges: run-kit `qa-loop.md`. Only the gate that raised a finding moves it to `verified` or `reopened`, after a retest.

### T2 test plan (`reports/<slug>/qa.md`, at pre-check)

1. **Static review** — ACs, edge cases and the design for ambiguity, untestable wording, missing states, contradictions → spec-issue findings before any code (the cheapest defects).
2. **Plan** — scope in/out; risks ranked (`references/test-design.md` § Risk → depth); quality characteristics in scope; levels; platforms and form factors; test data; environment and drivers (name what is missing now: emulator, browser runner, seeds); entry and exit criteria.
3. **RTM** — every AC, edge case, designed state and risk → test condition → the ticket that delivers it → test case → file, so the developer knows before coding what you will check.
4. **Entry to execution** — a clean code review on this code · build passes · the product starts in the preview environment · test data and drivers available (or the gap accepted). **Suspend** when the product does not start, the environment is broken or >30% of conditions are blocked: report `blocked` with the cause, never test around it.

### Severity and blocking

| Severity | Blocks a PASS |
|---|---|
| blocker, critical | always, when its basis is in scope |
| major | only when it violates an AC or agreed quality requirement **with** demonstrated user impact (`blocking: true`) |
| minor | no — listed; stays open, and you add it to `ISSUES.md` at the item's close if it still holds |
| trivial / cosmetic | no |
| enhancement | not a defect — backlog |

## Done when

- **Exit (PASS)**: every approved condition executed at the tier's depth · no open in-scope blocking finding · regression green · live preview clean where in scope · no weakened or skipped test. Never lower it to reach a PASS.
- **Verdict**: **PASS** · **FAIL** (blocking findings with severity, owner) · **PASS pending design decision** (UI/UX items for the designer only) · `blocked` / `needs-input` (entry criteria not met — name what is missing). Never PASS an unverified change.
- An escaped defect found after your PASS: add its test, record its cause under Lessons in the summary.

## References

Under `${CLAUDE_PLUGIN_ROOT}/skills/test-process/references/`:

| File | Read when |
|---|---|
| `test-design.md` | designing test cases (techniques, exploratory charters), levels and types, quality characteristics in scope (ISO/IEC 25010:2023), risk → depth |
| `ux-verification.md` | verifying UI/UX: conformance to the frontend design, Nielsen heuristics, WCAG 2.2 AA, UX severity |
| `defects-and-reports.md` | writing a finding, rating severity, issue priority, the test summary |
