---
description: "Fix a bug by tier: T1 debugger → developer → code-reviewer (∥ security) → qa · T2 adds a qa pre-check and reports"
argument-hint: "<bug, error message, failing test or issue ID (I3)> [--tier T1|T2]"
disable-model-invocation: true
---

# /technical-team:fix

Fix this bug with the technical team:

$ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*.

## When to use

- A bug, an error, a failing test, wrong behaviour. Empty request → ask for the bug or symptom, then stop.
- **Tier**: T1 or T2 (run-kit §2). Below T2 no gate writes a report file: the debugger's brief says `Write: –` and its reproduction and root cause stay in its handoff; pass them to the next briefs verbatim.

## Steps

| # | Step | Agent | Gate / verify |
|---|---|---|---|
| 1 | Root cause | `technical-team:team-debugger` with the full symptom (error text, stack trace, failing command, environment) | a reproduction and a root cause with `file:line`. The user only asked for the cause → stop here and report |
| 2 | Confirm | – | several fix options, or risk to shared code, data or security → show the user and wait |
| 3 | QA pre-check (T2 only) | `technical-team:team-qa` with the root cause and the qa-lines pre-check line | the regression test, failing on the unfixed code |
| 4 | Fix | `technical-team:team-developer` with the root cause (`technical-team:team-dba` for data fixes) | first the regression test, failing; then the fix; Evidence shows it failing before and passing after |
| 5 | Review | `technical-team:team-code-reviewer`; ∥ `technical-team:team-security` if the bug is security-related | PASS, or blocking findings → step 4 |
| 6 | Verify | `technical-team:team-qa` with the qa-lines execution line: the regression test, the related suite, the area around the fix | PASS, or blocking findings → step 4 as one batch (run-kit `qa-loop.md`) |
| 7 | Close | orchestrator §6 | the report gives the root cause in one paragraph |

## Workflow

**Fix loop (steps 3–6)** — step 2 stays inline. **Workflow** (run-kit §2 opt-in): call Workflow with `name: 'technical-team:team-build-loop'` (`${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js`) and `args` = `{item, groups: [[{ticket: "fix", role: "developer", brief: <step 4 brief with the root cause>, files: <the files the root cause names>}]], reviewBriefs: {"code-reviewer": …, "security": …(only if security-related)}, qaPlanBrief: <step 3 brief (T2)>, qaBrief: <step 6 brief>}` (keys as `${CLAUDE_PLUGIN_ROOT}/commands/feature.md` lists them). Write `item` back first, then route per run-kit §6.

## Done when

- The regression test fails on the unfixed code and passes after; review and qa PASS; the item is closed per orchestrator §6.
