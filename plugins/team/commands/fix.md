---
description: "Fix a bug: debugger → developer → code-reviewer → qa regression test"
argument-hint: "<bug, error message or failing test>"
disable-model-invocation: true
---

Fix this bug with the technical team:

$ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§6 — Read it if you are not already the lead. Empty request → ask for the bug or symptom, then stop.

1. **Root cause** — `technical-team:team-debugger` with the full symptom (error text, stack trace, failing command, environment) → `.team/reports/<slug>/debug.md`. If the user only asked for the cause, stop here and report.
2. **Confirm** — risk high (shared code, data, security) or several fix options → show the user and wait.
3. **Fix** — `technical-team:team-developer` with the debug report as its brief (`technical-team:team-dba` too for data fixes).
4. **Review** — `technical-team:team-code-reviewer` → `.team/reports/<slug>/review.md`; add `technical-team:team-security` in parallel if the bug is security-related. FAIL → step 3.
5. **Verify** — `technical-team:team-qa` writes the regression test (fails without the fix, passes with it), runs the related suite → `.team/reports/<slug>/qa.md`. FAIL → step 3.
6. **Close** — lead §6; the report gives the root cause in one paragraph.

Do not commit or push unless the user asks.
