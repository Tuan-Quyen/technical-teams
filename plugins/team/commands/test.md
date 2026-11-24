---
description: "QA writes missing integration/E2E/acceptance tests against the acceptance criteria, runs them, and flags missing unit coverage for the developer"
argument-hint: "[scope or item slug]"
disable-model-invocation: true
---

# /technical-team:test

Test with the technical team: $ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*.

## When to use

- "Add tests / is this covered". No production code changes.
- Scope: an item slug, a path, or the current changes (`git diff --stat`). Criteria: `.team/requirements/<slug>.md` if it exists, else documented or current behaviour (qa lists what it assumed).

## As a step

| Mode | Parent step | Runs | Hands back |
|---|---|---|---|
| `pre-check` | `feature` 5 (T2), `fix` 3 (T2), `new` 4 | step 2 before any code, with the qa-lines pre-check line | checks and the regression test; a spec issue stops the parent for its owner |
| `gate` | `feature` 8, `fix` 6, `new` 4 | step 2 on the parent item: the qa-lines execution line the first time, then the retest line with the known findings; the run whose PASS closes the item adds the leftovers line | the verdict (`verdicts.qa`, with not-run), findings and leftovers in the parent item; FAIL → the parent's `fix` (findings) |

Steps 3–4 do not run as a step; no `ISSUES.md` rows except the leftovers line's.

## Steps

| # | Step | Agent | Gate / verify |
|---|---|---|---|
| 1 | Scope | – | scope and criteria named in the qa brief |
| 2 | Test | `technical-team:team-qa` plans (reusing `.team/reports/<slug>/qa.md` if one exists; a new one only at T2), writes the missing integration, E2E and acceptance tests, runs them with the related suite and checks the running product if a user can see the change | a verdict with the ACs covered |
| 3 | Report | – | the verdict, the ACs covered and the findings (failing tests) |
| 4 | Close | – | as run-kit §2 *Check-only* |

- Missing unit/component coverage is a finding owned by developer, not a test qa writes → offer to brief `technical-team:team-developer` for them.
- Failures caused by production code are bugs: qa adds each as a `new` row in `.team/ISSUES.md` (say so in its brief, with Write `.team/ISSUES.md`); suggest `/technical-team:fix <ID>`, do not fix them here.

## Done when

- As a step: the verdict, findings and not-run checks are in the parent item.
- The missing tests exist and ran; every failure is an `ISSUES.md` row or a finding for developer.
