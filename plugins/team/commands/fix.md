---
description: "Fix a bug: debugger → qa pre-check (regression test defined) → developer → code-reviewer → qa retest + regression"
argument-hint: "<bug, error message or failing test>"
disable-model-invocation: true
---

Fix this bug with the technical team:

$ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§6 — Read it if you are not already the lead. Empty request → ask for the bug or symptom, then stop.

0. **Task list** — before the first spawn, put the steps below on the session's task list, one item per step (`update_plan` in the desktop app; `TaskCreate`/`TaskUpdate` in the CLI, loaded via ToolSearch if deferred; else `TodoWrite`), and keep it current (lead §3 *Task list*).
1. **Root cause** — `technical-team:team-debugger` with the full symptom (error text, stack trace, failing command, environment) → `.team/reports/<slug>/debug.md`. If the user only asked for the cause, stop here and report.
2. **Confirm** — risk high (shared code, data, security) or several fix options → show the user and wait.
**Fix loop (steps 3–6)** — step 2's confirm stays inline. **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below. Workflow run (load `technical-team:run-kit` if not loaded): run steps 3–6 as one workflow (STATE row step `3–6 (workflow)`; args keys as `${CLAUDE_PLUGIN_ROOT}/commands/feature.md` lists them): call Workflow with `name: 'technical-team:team-build-loop'` (`${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js`) and `args` = `{slug, groups: [[{ticket: "fix", role: "developer", brief: <step 4 brief with the debug report>, files: <files from debug.md>}]], reviewBriefs: {"code-reviewer": …, "security": …(only if security-related)}, qaPlanBrief: <step 3 brief>, qaBrief: <step 6 brief>, state: <STATE.md row>, tracker: <findings.md>}` (`dba` as the role too for data fixes). Route the result per run-kit §6. Unclear cause after a FAIL → the loop returns `stuck` (or `BLOCKED_PENDING_USER_DECISION` at the QA-Fix round cap); then brief `technical-team:team-debugger`.

3. **QA pre-check** — `technical-team:team-qa` with `debug.md`, the run-kit §3 *QA briefs* pre-check line and default profile T0 or T1 by risk (T2 for auth, payments, data): confirm the reproduction, define the regression condition and its level, and the regression area around the fix → `.team/reports/<slug>/qa.md`. Unit/component level → the developer writes that test with the fix; integration/E2E level → qa writes it now and records it failing on the unfixed code. Not `done` or a blocking spec issue → route it (debugger, architect or the user) before step 4.
4. **Fix** — `technical-team:team-developer` with the debug report and the run-kit §3 developer RTM line as its brief (`technical-team:team-dba` too for data fixes); its Evidence shows the regression test failing before the fix and passing after.
5. **Review** — `technical-team:team-code-reviewer` → `.team/reports/<slug>/review.md`; add `technical-team:team-security` in parallel if the bug is security-related. FAIL → step 4.
6. **Verify** — `technical-team:team-qa` with the run-kit §3 execution line: retest the original bug and the regression test, run the related suite and regress around the changed area → `.team/reports/<slug>/qa.md`. FAIL → read it by run-kit §3 *Reading a qa FAIL*; valid blocking findings → step 4, within the fix-round cap (run-kit §3).
7. **Close** — lead §6; the report gives the root cause in one paragraph.

Do not commit or push unless the user asks.
