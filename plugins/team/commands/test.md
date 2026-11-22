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

- The missing tests exist and ran; every failure is an `ISSUES.md` row or a finding for developer.
