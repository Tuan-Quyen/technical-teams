# Defects, retest, regression and the test summary

## Defect report (in `.team/QA.md#W-NNN` → Defects, and in the handoff)

```
#### W-012-D3 — Create button stays enabled while saving; double click creates two projects
- Severity: major · Priority: P1 · Type: functional | ui-ux | a11y | compatibility | performance | reliability | data | security-suspect
- Status: new · Scope: in-scope (introduced by W-012) | in-scope (breaks W-012.AC1 / DESIGN state) | pre-existing
- Found in: round 2 · build/commit <short sha or "working tree"> · Android emulator Pixel 6 API 34 (release build)
- Source: W-012.AC1 · DESIGN.md#W-012 state "pending" · heuristic H1 (if UX)
- User impact: a user who taps twice gets duplicate projects and has to delete one by hand
- Steps:
  1. Open Projects → New project
  2. Type "Alpha"
  3. Double-tap "Create" quickly
- Expected: button shows "Creating…" and is disabled; one project created (DESIGN.md state matrix, W-012.AC1)
- Actual: two "Alpha" rows; no pending state
- Evidence: test-results/w-012-create-double.png · e2e/preview/w-012.yaml step 6 · backend log 2× POST /api/projects 201
- Frequency: 5/5
- Suspected owner: developer (src/screens/NewProject.tsx submit handler)
```

| Rule | |
|---|---|
| One defect per report | split unrelated symptoms |
| Reproducible | minimal steps from a known state, with test data named (seeded user, not real data) |
| Expected from a source | AC, DESIGN.md, docs, platform convention, heuristic — cite it |
| Impact for major+ | one sentence of concrete user impact; without source + impact the severity is at most minor (test-process §2a) |
| Scope | in-scope or pre-existing (test-process §2a); pre-existing never blocks G2 |
| Evidence | screenshot / capture / transcript / log lines, never secrets |
| No fix prescriptions | suspected location is fine; the fix is the developer's |

## Severity (impact) × priority (urgency)

| Severity | Meaning |
|---|---|
| **Blocker** | blocks testing or a core flow; crash on start; data loss/corruption; security hole suspected |
| **Critical** | core function wrong, no reasonable workaround; wrong money/calculation; user misled into a harmful action |
| **Major** | function or designed state missing/wrong with a workaround; broken on a required platform/form factor; accessibility failure on a core flow |
| **Minor** | non-core function wrong, inconsistency, unclear copy, cosmetic issue users notice |
| **Trivial** | polish |

| Priority | Meaning |
|---|---|
| P0 | fix before anything else in this round |
| P1 | fix in this work item (required for PASS) |
| P2 | fix if cheap now, otherwise defer with a reason (lead decides) |
| P3 | backlog |

Default: blocker/critical → P0, major → P1, minor → P2, trivial → P3. Raise priority for high exposure (first screen, most-used flow, release-critical); say why when you deviate.

## Defect lifecycle

```mermaid
stateDiagram-v2
  [*] --> new: qa logs
  new --> open: lead routes to owner
  new --> moved: pre-existing → new work item (ID recorded)
  new --> rejected: not a defect (works as specified) — qa records the reason
  new --> design_question: needs designer / analyst decision
  design_question --> open: decided "fix"
  design_question --> closed: decided "accept" (record who and why)
  open --> fixed: developer hands off
  fixed --> retest: next qa round
  retest --> closed: original steps pass + regression around it green
  retest --> reopened: still fails or fix broke something
  reopened --> fixed
  open --> deferred: lead + user defer (minor/trivial only, reason + work item)
```

Only qa moves a defect to `closed` or `reopened`, and only after retesting. An **in-scope** blocker/critical/major can never be `deferred` while the work item passes G2; a **pre-existing** one goes to a new work item (`new → moved`, with its ID).

## Retest and regression per round

| Step | Do |
|---|---|
| Retest | every defect in `fixed`: run its original steps and its automated test |
| Regression | the area around each fix (same screen/module, callers, shared components), plus the relevant suite; full suite before PASS and at `release` |
| New defects | log with the round number; a defect introduced by a fix is linked to the defect it came from |
| Trend | per round: **open in-scope blocker/critical/major** (the number the lead tracks for progress), newly found, closed, reopened, pre-existing found — a rising reopen count is reported to the lead (escalation signal) |

## Test summary report (completion, attached to PASS / at `release`)

| Section | Content |
|---|---|
| Scope | work item, build/commit, platforms × form factors, what was out of scope and why |
| Coverage | RTM totals: conditions / test cases — passed · failed · blocked · not run; ACs covered n/n; designed states verified n/n; quality characteristics in scope and their result |
| Execution | commands + summary lines; live-preview evidence table; exploratory sessions (charter, duration, findings) |
| Defects | in-scope: found / closed / open by severity; open and deferred list with reasons · pre-existing: list with suggested new work items |
| UX | conformance result, heuristics issues, accessibility result, design questions and their decisions |
| Risks | residual risks, areas tested less (risk-based) and why, platforms not previewed |
| Exit criteria | each criterion → met / not met |
| Verdict | PASS / FAIL / PASS pending design decision |
| Lessons | escaped-defect root causes, missing ACs, catalogue rows proposed, testability problems |
