---
description: "QA writes missing integration/E2E/acceptance tests against the acceptance criteria, runs them, and flags missing unit coverage for the developer"
argument-hint: "[scope or item slug]"
disable-model-invocation: true
---

Test with the technical team: $ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§5 — Read it if you are not already the lead.

0. **Task list** — before the first spawn, put the steps below on the session's task list, one item per step (`update_plan` in the desktop app; `TaskCreate`/`TaskUpdate` in the CLI, loaded via ToolSearch if deferred; else `TodoWrite`), and keep it current (lead §3 *Task list*).
1. Resolve the scope: an item slug, a path, or the current changes (`git diff --stat`). Criteria: `.team/requirements/<slug>.md` if it exists, else documented or current behaviour (qa lists what it assumed).
2. `technical-team:team-qa` plans (reusing the plan and RTM in `.team/reports/<slug>/qa.md` if one exists), writes the missing integration, E2E and acceptance tests, runs them with the related suite and checks the running product if a user can see the change → `.team/reports/<slug>/qa.md`. Missing unit/component coverage is a finding owned by developer, not a test qa writes.
3. Report the verdict, the RTM and the findings. Failures caused by production code are bugs: suggest `/technical-team:fix` for each, do not fix them here. Missing unit/component tests → offer to brief `technical-team:team-developer` for them.
4. **Close** — remove the item's STATE row and move `reports/<slug>/` to `.team/archive/<slug>/` (lead §6 steps 2 and 4): this command's own row and reports only. If the scope is a build-loop item (its slug has a STATE.md § QA-Fix state row), never remove, reset or archive a build-loop item's STATE.md rows or reports here, and never report that item PASS or ready: a blocked item stays `BLOCKED_PENDING_USER_DECISION`; only its own pipeline closes it.
