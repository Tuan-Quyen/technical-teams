---
description: "QA writes missing integration/E2E/acceptance tests against the acceptance criteria, runs them, and flags missing unit coverage for the developer"
argument-hint: "[scope or item slug]"
disable-model-invocation: true
---

Test with the technical team: $ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§5 — Read it if you are not already the lead.

0. **Task list** — before the first spawn, put the steps below on the session's task list, one item per step (`update_plan` in the desktop app; `TaskCreate`/`TaskUpdate` in the CLI, loaded via ToolSearch if deferred; else `TodoWrite`), and keep it current (lead §3 *Task list*).
1. Resolve the scope: an item slug, a path, or the current changes (`git diff --stat`). Criteria: `.team/requirements/<slug>.md` if it exists, else documented or current behaviour (qa lists what it assumed).
2. `technical-team:team-qa` plans (reusing `.team/reports/<slug>/qa.md` if one exists; a new one only at T2), writes the missing integration, E2E and acceptance tests, runs them with the related suite and checks the running product if a user can see the change. Missing unit/component coverage is a finding owned by developer, not a test qa writes.
3. Report the verdict, the ACs covered and the findings (failing tests). Failures caused by production code are bugs: add each as a `new` row in `.team/ISSUES.md` and suggest `/technical-team:fix <ID>`, do not fix them here. Missing unit/component tests → offer to brief `technical-team:team-developer` for them.
4. **Close** — delete this command's own item JSON and move its `reports/<slug>/` (if any) to `.team/archive/<slug>/` (lead §6). A build-loop item in scope (it has `.team/items/<slug>.json`) is never changed, closed or reported PASS or ready here: a blocked item stays blocked; only its own pipeline closes it.
