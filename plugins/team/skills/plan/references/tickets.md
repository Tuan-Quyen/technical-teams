# Tickets — pm

> Used by: pm · Read when: a ticket breakdown or code-check issues

Output: the item's section in `.team/TASKS.md` from `templates/core/TASKS.md`, and (in a workflow) the same tickets in the structured output: `id`, `title`, `role`, `group`, `milestone` (optional), `files`, `dependsOn`, `acs`, `estimate` (days).

## From plan steps to tickets

- One ticket per implementation-plan step. A step too big for one ticket → split it and tell the architect which step; never merge two steps into one ticket.
- Summary: verb + object, ≤ 12 words, readable without the ID (`CART-T2 (add coupon field to checkout)`).
- Owner: `developer` for app code and its unit tests, `dba` for migrations and data scripts, `devops` for CI/CD, Docker, manifests.
- Files: the step's paths, repo-relative; a directory owns everything under it.
- ACs: the requirement IDs (`CART-AC1`) the ticket proves; every AC of the item appears in at least one ticket.

## Slicing and estimating

| Est (d) | Means | Do |
|---|---|---|
| 0.5 | one file or a few, one behaviour | keep |
| 1–2 | a few files, one behaviour end to end, with its tests | keep |
| > 2 | several behaviours | split: it is two tickets hiding as one (code check `estimate-split`) |

- An estimate is an assumption: days of real work a human engineer needs for the step as planned (code, tests, review fixes), in 0.5-day steps, from its files, layers and tests — not the agents' speed. Unsure → the higher number and why in the Handoff.
- Never edit an estimate to match the agent time; the gap is the data. A re-plan sets a new estimate and says so in the Handoff.

- Slice vertically (one behaviour through its layers) so each ticket can be tested alone; split horizontally only when a contract lets the halves run in parallel.
- A ticket independent of others is better than a small one that waits for three.

## Dependencies and groups

- `dependsOn` only for a real order: it needs the other ticket's code or migration first.
- Group 1 holds tickets with no dependency; a ticket goes in the group after its latest dependency. Groups are numbered 1, 2, 3… with no gap, per milestone.
- Same group = runs in parallel = disjoint `files`. Two tickets that must touch the same file → different groups, or one ticket.
- Shared touch points (routes, DI registry, schema, a shared type) → one early ticket the others depend on.

## Milestones (new projects)

- `<KEY>-M1`, `<KEY>-M2`…; M1 is a walking skeleton: build, lint, test runner and one end-to-end slice running.
- Each milestone ends in something the user can see or run; a ticket depends only on its own or an earlier milestone.

Sprints, risks, status updates and the standup report: `sprint.md`.

## When the code check sends issues back

Each issue names the ticket, the rule and the detail (`CART-T2, CART-T3 file-overlap: src/cart and src/cart/api.ts overlap inside milestone 1, group 2`). Fix exactly those, then update `TASKS.md` and the structured output together. The rules are in `SKILL.md` § *The tickets are ready when*.
