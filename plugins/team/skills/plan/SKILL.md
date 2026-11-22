---
name: plan
description: "The team's planning method: solution design that fits the real code, ADRs, the implementation plan, ticket breakdown that passes the plan-tickets check (slices, estimates, owners, files, dependencies, parallel groups, milestones), and sprint planning from a goal or epic to a committed sprint (who takes part in each step, priority from ba and qa, capacity fit, critical path, risks, standup, sprint close). architect loads it for a non-trivial design; pm for tickets, a sprint, a standup or a close; the orchestrator for `standup plan`."
---

# plan — a design that fits, tickets that run in parallel, a sprint the team can finish

A plan is good when the developer needs no second design pass, parallel tickets never touch the same file, each ticket proves its ACs on its own, and the user committed the sprint knowingly.

## When to load

architect, for a non-trivial design or an ADR; pm, for a ticket breakdown, a sprint plan, a standup or a sprint close; the orchestrator, for `/technical-team:standup plan` (it runs `references/sprint.md` and spawns the roles).

## Principles

### 1. Design against the real code

**Read it first; never design against a guess.**

- Requirements, frontend design, `ARCHITECTURE.md`, `.team/adr/` and the code on the path, cited `file:line`. Anything you could not verify is marked `unverified`.
- architect never invents a requirement or an AC: ask ba.

Test: does every design claim about the system cite a file?

### 2. The smallest design that fits

**Every new dependency, layer or service must pay for itself.**

- Compare options on the drivers only; the chosen option names its trade-off, a rejected one says why not.

Test: is there a smaller option, and does the design say why it lost?

### 3. One owner per file

**architect owns the design; pm owns the tickets.**

- architect: `.team/system-design/<slug>.md`, ADRs, `ARCHITECTURE.md` (links ADRs, never copies them). pm: `.team/TASKS.md`.
- Neither changes the other's file, nor the requirements: a conflict goes back to its owner.
- Parallel tickets touch disjoint files; shared touch points go in one early ticket.

Test: could two tickets of one group ever write the same file?

### 4. Checkable plans

**A plan is ready when its rules pass, not when it reads well.**

- Each plan step and ticket names its files and ACs; the ticket rules below are checked in code by `plan-tickets`.
- pm marks a ticket `done` only with its gate evidence, never because a brief says so.

Test: would plan-tickets return no issues?

### 5. The user commits the sprint

**pm proposes a sprint; it opens only on the user's OK, and nothing builds from it.**

- Show goal, dates, capacity, committed tickets, what did not fit, critical path, risks and open questions; then wait. Each committed item then runs its own pipeline.

Test: is the user's OK on the committed scope recorded before the sprint opened?

### 6. Priority from its owner, capacity in real days

**pm orders by priority, never sets it; summed `Est (d)` ≤ capacity, never shrink an estimate to fit.**

- Stories: ba's Must / Should / Could (the user decides). Issues: qa's P1 / P2 / P3. No priority → ask its owner.
- Fill Must, then Should, then Could, in dependency order; cuts listed by ID. Must alone over capacity → the user cuts or raises capacity.

Test: does committed ≤ capacity hold with every estimate unchanged, and does each rank trace to a requirement or issue row?

## Method

```
requirements (ba) + frontend design (designer)
   │
   ▼
architect: read code → drivers → options → design + contracts → implementation plan (→ ADR)
   │                                        └─ schema/data change → dba writes "Data and migrations"
   ▼
pm: one ticket per plan step → groups by dependency and files → TASKS.md (code-checked by plan-tickets)
   │
   ▼
pm: sprint — priority (ba, qa) + capacity → committed scope → user OK → board
   │
   ▼
qa pre-check maps RTM conditions to tickets → developer builds
```

Design steps and ADRs: `references/solution-design.md`. Tickets: `references/tickets.md`. Sprint steps, who takes part, the board, standup and close: `references/sprint.md`.

## Done when

### The design is ready when

- Every AC of the requirements maps to a component and a plan step; nothing in the plan lacks an AC.
- Contracts (API, events, schema, errors) are written out: request, response, error cases.
- Each plan step names its files and ACs; steps meant to run in parallel touch disjoint files.
- The chosen option names its trade-off; at least one rejected alternative says why not.
- Risks have a mitigation or an owner; anything you could not verify is marked `unverified`.
- A schema or data change has dba's "Data and migrations" rows (expand → backfill → contract, rollback).
- It fits the template Budget (≤ 200 lines; a big item → one file per milestone).

### The tickets are ready when (plan-tickets checks the first eight in code)

| Rule | Code check |
|---|---|
| at least one ticket | `no-tickets` |
| IDs `<KEY>-T<n>` with the item key from the brief, unique | `id-format`, `unique-id` |
| owner is `developer`, `dba` or `devops` | `role` |
| every ticket has files (repo-relative, not under `.git`/`.claude`) and ACs | `files`, `unsafe-path`, `acs` |
| every ticket has an estimate in days of real work above 0 and at most 2 | `estimate`, `estimate-split` |
| groups are whole numbers from 1 with no gap; milestones whole numbers from 1 | `group`, `group-gap`, `milestone` |
| dependencies exist, are not the ticket itself, sit in an earlier milestone or in an earlier group of the same milestone, and form no cycle | `unknown-dependency`, `self-dependency`, `dependency-order`, `cycle` |
| tickets in the same group and milestone have disjoint files (case-insensitive; a directory contains everything under it) | `file-overlap` |
| one ticket ≈ one plan step; summary ≤ 12 words a user can read | pm's judgment |

### The sprint is ready when

- Goal, start and end dates, capacity, committed and done days are on the board; committed ≤ capacity.
- Every Must is in, or the user was told why not; cuts listed by ID; every committed ticket has an owner role, an estimate, its ACs and its priority source.
- Critical path and risks (each with a source) were shown; the user's OK is recorded.

## References

Under `${CLAUDE_PLUGIN_ROOT}/skills/plan/references/`:

| File | Read when |
|---|---|
| `solution-design.md` | architect: drivers, options and trade-off, contracts, data and migrations, risks, the implementation plan; when a decision needs an ADR, writing and superseding one |
| `tickets.md` | pm: plan steps → tickets, slicing and estimating, dependencies, groups, milestones, the code check's rules |
| `sprint.md` | orchestrator and pm: the sprint steps and who takes part, capacity fit, critical path; pm: sprint fields, risks and blockers, status updates, the standup report, closing a sprint |
