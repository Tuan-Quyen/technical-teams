# <slug> — findings

> Owner: **the orchestrating session** (team-lead). The item's one finding tracker for qa and reviewers: build-loop returns it as `tracker` (write it here, pass it back on every call); inline, the lead registers each new gate finding here. An bug ID is given once and never changes or gets reused, whatever happens to title, file or line. Gate reports keep their own IDs (`Q-`, `R-`, `S-`) as Source.
> Status: `OPEN → IN_PROGRESS → FIXED_PENDING_RETEST → VERIFIED`, or `REOPENED` (same bug ID). `DEFERRED` and `REJECTED` only by the lead, with the reason. Lead: Owner (a ticket) and Blocking (yes / no) override the gate's call on the next run.
> **Budget:** the table ≤ 60 lines (verified and rejected rows collapse into `Closed:`). The **Tracker data** block is machine data, outside the budget: paste the last result's `tracker` there verbatim, every entry and its full history, and pass it back as `args.tracker`.

| ID | Origin · Source | Status | Severity | Blocking | Owner | Requirement | Where | Title | Related | History (QA-Fix round: event) |
|---|---|---|---|---|---|---|---|---|---|---|
| CART-B1 | QA · CART-Q1 | OPEN | major | yes | CART-T1 | CART-AC2 | `<path:line>` | <title> | – | 0: opened · 1: fix · 1: fixed |

Closed: <bug IDs verified or rejected, or "none">
Deferred (not fixed, not blocking): <bug ID — reason — by whom, or "none">

## Tracker data

```json
[]
```
