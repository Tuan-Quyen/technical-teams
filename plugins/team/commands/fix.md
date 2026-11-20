---
description: "Fix a bug: debugger → developer → code-reviewer → qa regression test"
argument-hint: "<bug, error message or failing test>"
disable-model-invocation: true
---

Fix this bug with the technical team:

$ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§6 — Read it if you are not already the lead. Empty request → ask for the bug or symptom, then stop.

0. **Task list** — before the first spawn, put the steps below on the session's task list, one item per step (`update_plan` in the desktop app; `TaskCreate`/`TaskUpdate` in the CLI, loaded via ToolSearch if deferred; else `TodoWrite`), and keep it current (lead §3 *Task list*).
1. **Root cause** — `technical-team:team-debugger` with the full symptom (error text, stack trace, failing command, environment) → `.team/reports/<slug>/debug.md`. If the user only asked for the cause, stop here and report.
2. **Confirm** — risk high (shared code, data, security) or several fix options → show the user and wait.
**Fix loop (steps 3–5)** — step 2's confirm stays inline. **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below. Workflow run: run steps 3–5 as one workflow, exactly as `${CLAUDE_PLUGIN_ROOT}/commands/feature.md` describes for its build loop (task list, STATE row `3–5 (workflow)`, result handling, re-run): call Workflow with `name: 'technical-team:team-build-loop'` and `args` = `{slug, groups: [[{ticket: "fix", role: "developer", brief: <step 3 brief with the debug report>, files: <files from debug.md>}]], reviewBriefs: {"code-reviewer": …, "security": …(only if security-related)}, qaBrief: <step 5 brief>}` (if the name is not found, Read `${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js` and pass its text as `script` with the same args) (`dba` as the role too for data fixes). Unclear cause after a FAIL → the loop returns `stuck`; then brief `technical-team:team-debugger`.

3. **Fix** — `technical-team:team-developer` with the debug report as its brief (`technical-team:team-dba` too for data fixes).
4. **Review** — `technical-team:team-code-reviewer` → `.team/reports/<slug>/review.md`; add `technical-team:team-security` in parallel if the bug is security-related. FAIL → step 3.
5. **Verify** — `technical-team:team-qa` writes the regression test (fails without the fix, passes with it), runs the related suite → `.team/reports/<slug>/qa.md`. FAIL → step 3.
6. **Close** — lead §6; the report gives the root cause in one paragraph.

Do not commit or push unless the user asks.
