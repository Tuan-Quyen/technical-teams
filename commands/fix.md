---
description: "Fix a bug: debugger → developer → code-reviewer → qa regression test"
argument-hint: "<bug, error message or failing test>"
disable-model-invocation: true
---

Fix this bug with the technical team:

$ARGUMENTS

Empty request → ask for the bug or symptom, then stop. Pick a short `<slug>` for `.team/<slug>/`.

1. **Root cause** — `technical-team:team-debugger` with the full symptom (error text, stack trace, failing command, environment). If the user only asked for the cause, stop here and report.
2. **Confirm** — high risk (shared code, data, security) or several fix options → show the user and wait. Otherwise continue.
3. **Fix** — `technical-team:team-developer` with the diagnosis as its brief (`technical-team:team-dba` too for data fixes).
4. **Review** — `technical-team:team-code-reviewer` on the diff; add `technical-team:team-security` in parallel if the bug is security-related. Blocking → step 3.
5. **Verify** — `technical-team:team-qa` writes the regression test (fails without the fix, passes with it) and runs the related suite. FAIL → step 3.
6. Summarise: root cause in one paragraph, fix, files changed, test evidence.

Do not commit or push unless the user asks.
