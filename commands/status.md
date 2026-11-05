---
description: "Summarize the team's current state from .team/STATE.md and .team/TASKS.md — what waits for you, gates, blocked tickets"
disable-model-invocation: true
---
# /technical-team:status — current state

Run this yourself in the current session; do not delegate (read-only, no agent, no file changes).

```mermaid
flowchart LR
  A{.team/STATE.md exists?} -- no --> B[say no team work yet; any command starts it]
  A -- yes --> C[Read STATE + TASKS + ROSTER count, skip missing files] --> D[Summary, newest first] --> E[Next command per item]
```

| Section (in this order, user's language) | Source |
|---|---|
| **Waiting for you** — pending gates and decisions | `STATE.md` → status `waiting-for-user` |
| Active work items — ID, title, pipeline/tier (with mode), status, gate, what it waits for | `STATE.md` |
| New-project runs (pipeline `new`) — phase, milestone k/n, next step, pending gate | `STATE.md` → `Phase`, `Milestones`, `Next step`, `Gate` |
| Tickets `blocked` / `doing` with owner role | `TASKS.md` |
| Delivery loops stalled (same failure two rounds) or long-running, escalation step reached | `STATE.md` → `Loop log` |
| Deferred findings still open | `STATE.md` |
| Specialists (count) | `config/agents.json`, `ROSTER.md` |

| Then | |
|---|---|
| Suggest the next command per item | answer the pending gate, `new` (no argument) to resume a new-project run where it stopped, `feature` to continue, `fix` for a reported bug, … |
