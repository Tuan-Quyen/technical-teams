# Issues

> Owner: **team-qa** — type, severity, priority, area, duplicates and order. The lead only adds `new` rows and sets `status` and `item` when an item starts from or closes an issue. Everyone else reads it.
> IDs: `I<n>`, project-wide, never reused: take the `Next ID` line below and raise it; it survives compaction, so a removed row's ID is never handed out again. Elsewhere write the ID with its title: `I3 (double charge on retry)`.
> Severity: blocker · critical · major · minor · trivial (`test-process` defects-and-reports). Priority: P1 next · P2 this milestone · P3 backlog.
> Status: new · open · needs-info · in-progress · fixed · duplicate · not-a-bug · wontfix.
> **Budget:** one row per issue, sorted by priority then severity; `Title` ≤ 8 words, `Source` ≤ 8 words. Closed rows (fixed, duplicate, not-a-bug, wontfix) are removed at compaction; git keeps them.

Next ID: I2

| ID | Title | Type | Severity | Priority | Area | Status | Source | Item |
|---|---|---|---|---|---|---|---|---|
| I1 | <symptom, ≤ 8 words> | bug / enhancement / debt | major | P1 | CART | open | <user · `cart-checkout#F2` · qa run> | – |

Needs info: <I4 — what is missing, ≤ 15 words — or "none">
Duplicates: <I5 → I2, or "none">
