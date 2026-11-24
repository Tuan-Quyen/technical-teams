---
description: "Standup / status report on the task board .team/TASKS.md: pm reads the item state, tickets and issues, updates blockers and risks and writes the latest status report; `close` ends the sprint with a review and opens the next; `plan` plans a sprint from a goal or epic (ba → architect → pm) and opens it on your OK"
argument-hint: "[close | plan [<weeks> <capacity days>] [<goal or epic>]]"
disable-model-invocation: true
---

# /technical-team:standup

Standup: $ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*. No code changes; one pm spawn, except `plan` (Steps below).

## When to use

- "Standup / status / progress / sprint / risks", only when the user asks.
- "Plan a sprint / sprint planning / what goes in the next sprint" → `plan`.

## As a step

| Mode | Parent step | Runs | Hands back |
|---|---|---|---|
| `sync` | each board sync of `feature`, `new` and `fix` (run-kit §2 **Board sync**) | step 2 only, with Read and Write `.team/TASKS.md`, the qa-lines board-sync line and one line per ticket derived from the item (run-kit `qa-loop.md` § Board sync), with measured agent time; skip when no status changed | the board matches the item; at PASS pm's handoff is the closing call |

## Steps

| # | Step | Agent | Gate / verify |
|---|---|---|---|
| 1 | Check | – | read `.team/TASKS.md`; missing or no tickets → say there is nothing planned yet and stop (`plan`: create it from `${CLAUDE_PLUGIN_ROOT}/templates/core/TASKS.md`). Read `.team/STATE.md` for the open items |
| 1b | Plan (`plan` only) | load `technical-team:plan` and run `references/sprint.md` steps 1–5: goal and capacity from the user, the backlog, a new epic through `feature` steps 1–4 at T2 (`technical-team:team-ba`, `technical-team:team-designer`, `technical-team:team-architect`, `technical-team:team-pm`), then stop before its step 5 | ba's questions and the design → the user; the plan-tickets code check |
| 2 | Report | `technical-team:team-pm` with Read `.team/STATE.md`, `.team/items/*.json`, `.team/ISSUES.md`, `.team/TASKS.md`, Write `.team/TASKS.md`, today's date and time, and one mode line below | the Status report replaced |
| 3 | Show | – | print the Status report and any new or changed risk; ask nothing unless pm's Handoff needs a decision. `plan` → show goal, committed tickets, not-fit list, critical path, risks and open questions, and wait for the user's OK; then pm opens the sprint |

Mode line by request:
- empty → `PM mode: standup. Update Blocked and Risks from the sources; replace the Status report; change no ticket status without evidence in this brief.`
- `close` → `PM mode: close sprint. Sprint review (committed vs done days, carry-over by ID) into the Closed line, open the next sprint, then the standup.`
- `plan …` → `PM mode: sprint plan. Load plan (references/sprint.md). Set length and capacity from this brief; a candidate with no tickets (a T1 item, an issue) gets one ticket with an estimate; fill the sprint by priority, then dependency order; list what did not fit and the critical path; keep the sprint proposed until the user's OK is in a brief.` Give each candidate's priority source (requirements, `ISSUES.md` row) under **Constraints**.

Under **Constraints** give each ticket's measured agent time you have from this session's handoffs (`CART-T2 25m`), or "none".

## Done when

- The board's Status report is current and shown; no ticket status changed without evidence.
- As a step (`sync`): every listed ticket shows the status the item gives it; nothing else changed.
- `plan`: the sprint is open on the board with the user's OK, per plan § The sprint is ready when; no build started.
