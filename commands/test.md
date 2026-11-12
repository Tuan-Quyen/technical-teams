---
description: "QA writes missing tests against the acceptance criteria and runs them"
argument-hint: "[scope or feature]"
disable-model-invocation: true
---

Test with the technical team: $ARGUMENTS

1. Resolve the scope: as given, or the current changes (`git diff --stat`). Find the criteria: `.team/<slug>/spec.md` if it exists, else documented or current behaviour (list what was assumed).
2. `technical-team:team-qa` maps criteria to tests, writes the missing ones, runs them and checks the running product if a user can see the change.
3. Report the verdict, the AC → test table and defects. Failures caused by production code are reported as bugs with a suggested `/technical-team:fix`, not fixed here.
