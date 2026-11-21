# run-kit §2 · Who owns which quality check

One owner per check, no duplicate tests.

| Check | developer | code-reviewer | qa |
|---|---|---|---|
| unit/component tests (happy, negative, boundary, error paths) | writes + runs | reviews: meaningful, not weakened or skipped | finds gaps → finding for developer |
| build, lint, related suites, smoke | runs before handoff, evidence in Handoff | re-runs unless green CI covers the current commit and a clean tree | checks the evidence (entry criteria) |
| correctness, requirements/design fit, error handling, contracts, regression risk | self-check against the RTM | reviews the diff | — |
| AC review, checks, regression test, risk (T2: test plan, RTM) | reads them before coding | — | pre-check, before any code |
| integration, E2E, acceptance, live preview, UX, exploratory, regression | — | — | execution, after review PASS |
| PASS / FAIL of the product | never claims it | review verdict only | final verdict |
