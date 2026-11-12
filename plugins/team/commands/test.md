---
description: "QA writes missing tests against the acceptance criteria and runs them"
argument-hint: "[scope or item slug]"
disable-model-invocation: true
---

Test with the technical team: $ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§5 — Read it if you are not already the lead.

1. Resolve the scope: an item slug, a path, or the current changes (`git diff --stat`). Criteria: `.team/requirements/<slug>.md` if it exists, else documented or current behaviour (qa lists what it assumed).
2. `technical-team:team-qa` plans, writes the missing tests, runs them and checks the running product if a user can see the change → `.team/reports/<slug>/qa.md`.
3. Report the verdict, the RTM and the findings. Failures caused by production code are bugs: suggest `/technical-team:fix` for each, do not fix them here.
