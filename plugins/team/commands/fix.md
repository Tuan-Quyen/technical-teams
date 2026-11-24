---
description: "Fix a bug by tier: T1 debugger → developer → review → test · T2 adds a qa pre-check and reports; a bug in a board ticket keeps TASKS.md in sync"
argument-hint: "<bug, error message, failing test, issue ID (I3) or ticket ID (CART-T3)> [--tier T1|T2]"
disable-model-invocation: true
---

# /technical-team:fix

Fix this bug with the technical team:

$ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*.

## When to use

- A bug, an error, a failing test, wrong behaviour. Empty request → ask for the bug or symptom, then stop.
- **Tier**: T1 or T2 (run-kit §2). Below T2 no gate writes a report file: the debugger's brief says `Write: –` and its reproduction and root cause stay in its handoff; pass them to the next briefs verbatim.
- **Board ticket** — the request names a ticket (`CART-T3`), or step 1's root cause lies in the `Files` of a ticket on `.team/TASKS.md` → set the item's `ticket` to its ID: it is the fix's ticket in step 4, and every board sync of run-kit §2 runs for it (a `done` ticket goes back to `doing` until this fix passes). The bug is in an open item's ticket → no new item: it is that item's finding, fixed by its own loop.

## As a step

| Mode | Parent step | Runs | Hands back |
|---|---|---|---|
| `findings` | the review/test loop of `feature`, `new`, `infra` and this command | step 4 only, for the parent item's open blocking findings as one batch (run-kit `qa-loop.md`): one developer (devops for infra) per owner ticket, each finding's test is its regression test, the qa-lines fix line; no debugger, no step 2 | `round` + 1, each finding `fixed` or `challenged`; the parent's next `review` and `test` gates re-check them |
| `symptom` | a parent step meets a failure with an unclear cause, or a `stalled` finding the user sent to the debugger | steps 1–4 for that symptom in the parent item | as `findings` |

## Steps

| # | Step | Agent | Gate / verify |
|---|---|---|---|
| 1 | Root cause | `technical-team:team-debugger` with the full symptom (error text, stack trace, failing command, environment) | a reproduction and a root cause with `file:line`. The user only asked for the cause → stop here and report |
| 2 | Confirm | – | several fix options, or risk to shared code, data or security → show the user and wait |
| 3 | QA pre-check (T2 only) | `test` (as a step: pre-check), with the root cause | the regression test, failing on the unfixed code |
| 4 | Fix | `technical-team:team-developer` with the root cause (`technical-team:team-dba` for data fixes) | first the regression test, failing; then the fix; Evidence shows it failing before and passing after |
| 5 | Review | `review` (as a step: gate); ∥ security if the bug is security-related | PASS, or blocking findings → `fix` (as a step: findings) |
| 6 | Verify | `test` (as a step: gate): the regression test, the related suite, the area around the fix | PASS, or blocking findings → `fix` (as a step: findings), then 5 and 6 again |
| 7 | Close | orchestrator §6 | the report gives the root cause in one paragraph |

## Workflow

**Fix loop (steps 3–6)** — step 2 stays inline. **Workflow** (run-kit §2 opt-in): call Workflow with `name: 'technical-team:team-build-loop'` (`${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js`) and `args` = `{item, groups: [[{ticket: <the item's ticket, else "fix">, role: "developer", brief: <step 4 brief with the root cause>, files: <the files the root cause names>}]], reviewBriefs: {"code-reviewer": …, "security": …(only if security-related)}, qaPlanBrief: <step 3 brief (T2)>, qaBrief: <step 6 brief>, boardBrief: <only with a ticket>}` (keys as `${CLAUDE_PLUGIN_ROOT}/commands/feature.md` lists them). Write `item` back first, then route per run-kit §6.

## Done when

- The regression test fails on the unfixed code and passes after; review and qa PASS; the item is closed per orchestrator §6.
- With a ticket: its board status matches the item (`done` after PASS).
- As a step: the batch's findings are `fixed` or `challenged` in the parent item.
