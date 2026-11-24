# run-kit §2, §5 · Who owns which check, who decides which call

> Used by: the orchestrating session, developer, code-reviewer, qa · Read when: a gap or duplicate check between developer, code-reviewer and qa; recording a verdict or decision

## Quality checks

One owner per check, no duplicate tests.

| Check | developer | code-reviewer | qa |
|---|---|---|---|
| unit/component tests (happy, negative, boundary, error paths) | writes + runs | reviews: meaningful, not weakened or skipped | finds gaps → finding for developer |
| build, lint, related suites, smoke | runs before handoff, evidence in Handoff | re-runs unless green CI covers the current commit and a clean tree | checks the evidence (entry criteria) |
| correctness, requirements/design fit, error handling, contracts, regression risk | self-check against the RTM | reviews the diff | — |
| AC review, checks, regression test, risk (T2: test plan, RTM) | reads them before coding | — | pre-check, before any code |
| integration, E2E, acceptance, live preview, UX, exploratory, regression | — | — | execution, after review PASS |
| PASS / FAIL of the product | never claims it | review verdict only | final verdict |

## Who decides

The orchestrator routes and records; each call below is its owner's, and the orchestrator writes it into the item verbatim.

| Decision | Owner |
|---|---|
| ticket status during a build loop | the board-sync table (`qa-loop.md` § Board sync), from the item; pm writes it |
| ticket `done` / `blocked` outside a build loop, re-plan, a finding's owner ticket | pm (from the handoffs and gate verdicts in its brief) |
| item closes | pm for an item with tickets; else its last gate (qa; code-reviewer for T0, infra) |
| a finding's severity, blocking, `verified` / `reopened` | its finder (qa, code-reviewer, security, dba) |
| challenge outcome | finder, else the arbiter (`qa-loop.md`) |
| retest and regression scope | qa |
| `ISSUES.md` rows, type, severity, status, duplicates | qa |
| `ISSUES.md` priority and order | pm (from qa's severity and ba's, architect's, security's advice) |
| what goes into `PRODUCT.md` | ba |
| design, ADR content | architect; an ADR is accepted by the user |
| defer / reject a finding, accept a not-run check, a round past the cap | the user |
| pipeline, tier (ba or architect may raise it), who runs next | orchestrator |
