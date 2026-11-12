---
name: test-process
description: The QA engineer's full test process, adapted from ISTQB (planning, monitoring and control, analysis, design, implementation, execution, completion) and the STLC — risk-based test planning with entry/exit criteria, static review of acceptance criteria and design, test design techniques (equivalence partitioning, boundary values, decision tables, state transitions, exploratory charters), the quality characteristics to cover (ISO/IEC 25010:2023 — functional suitability, interaction capability/UX, compatibility, performance, reliability, security, maintainability, portability), UI/UX verification against the design and usability heuristics, defect reports with severity and priority, retest and regression, and the test summary report that backs the G2 verdict. Preloaded into qa; QA owns product quality sign-off.
---

# test-process — QA is the gate for product quality

PASS = the product does what the spec says (**verification**), a real user can use it (**validation**), nothing that worked is broken (**regression**) — with evidence.

Read on demand (paths under `${CLAUDE_PLUGIN_ROOT}/skills/test-process/references/`):

| File | When |
|---|---|
| `process.md` | writing the test plan (ISTQB activities → pipeline steps, outputs), full entry/exit and calibration rules, micro verify |
| `techniques.md` | designing test cases (EP, BVA, decision table, state transition, pairwise, exploratory charters), levels and types |
| `quality-checklist.md` | choosing quality characteristics in scope (ISO/IEC 25010:2023) and depth by risk |
| `ux-verification.md` | verifying UI/UX: conformance to `.team/frontend-design/` (the item's file + `_system.md`), Nielsen heuristics, WCAG 2.2 AA, UX severity |
| `defects-and-reports.md` | finding report format, severity × priority, lifecycle, retest/regression, test summary |

## Where each activity happens

| Step | Do | Output in `.team/qa/<slug>.md` |
|---|---|---|
| P3a (before G1) | risk-ranked test plan; static review of ACs, edge cases, designed states; RTM conditions mapped to tickets; name missing drivers/environment now | test plan, review findings, RTM |
| D3 / S3 round 1 | entry criteria → smoke → tests with techniques → live preview → UI/UX verification → exploratory → defects | findings table, round detail |
| Round ≥ 2 | retest `fixed` findings + regression around changes + changed areas only | findings status, round detail (replaced) |
| Passing round, `release` | exit criteria check, test summary, lessons | test summary |

The file is yours alone and starts with `Verdict: PASS | FAIL · Round N` (`PENDING · Round 0` before the first execution round). One qa run per round covers every in-scope platform. Finding IDs `Q-01`… are fixed; status `open` → `fixed` → `verified` (or `dropped` with the reason); the round detail keeps the latest round only.

## Binding rules

| Rule | |
|---|---|
| Exit (PASS) | every RTM condition executed · AC/edge/state cases pass · live preview clean on in-scope platforms · UI/UX verified · regression green · **no open in-scope blocker/critical/major** · no weakened/skipped test |
| Scope lock | only defects introduced by the change or breaking its AC or designed state block G2; pre-existing ones are logged (`Scope: pre-existing`), stay `open` and become follow-up tickets when the item closes |
| Target lock | exit criteria + RTM fixed at G1 (small: S0); additions only as a proposal to the lead; a design revision (architect) is the one allowed update |
| Depth by tier | T2/`new` full · T1 small: ACs + regression of touched area + live preview of what changed, exploratory only for core flows · fix: reproduce → regression test → retest · hotfix: minimal + residual risks listed · micro: `process.md` §5 |
| Severity | major+ cites a source (AC, designed state, heuristic, WCAG, convention) **and** a concrete user impact, else at most minor; unsure → lower level |
| Independence | expected results from requirements/design/docs/conventions, never from current behaviour |
| Usability | spec-compliant but unusable = defect; caused by the design → escalate as a design question |

## Verdict

**PASS** · **FAIL** (findings with severity, priority, owner) · **PASS pending design decision** (UI/UX items for the designer only; line 1 says `PASS`, the items stay `open`) · **`vướng` / `cần quyết định`** (entry criteria not met — name what is missing).
