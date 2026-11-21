---
name: technical-planning
description: The architect's and pm's planning method — solution design that fits the real code (read it first, smallest design in existing patterns, quality attributes that drive the choice, options with their trade-off, contracts pinned before parallel work, data and migrations with dba, risks, rejected alternatives), architecture decision records (when a decision earns one, format, superseding), the implementation plan pm can ticket, and ticket breakdown (vertical slices, honest sizing, owner, files, dependencies, parallel groups with disjoint files, milestones with a walking skeleton) that passes the plan-tickets code check. architect loads it for a non-trivial design; pm loads it for a ticket breakdown.
---

# technical-planning — a design that fits, tickets that can run in parallel

A plan is good when the developer needs no second design pass, parallel tickets never touch the same file, and each ticket proves its ACs on its own. architect owns the design (`.team/system-design/<slug>.md`, ADRs, `ARCHITECTURE.md`); pm owns the tickets (`.team/TASKS.md`). Neither changes the other's file: a conflict goes back to its owner.

Read on demand (paths under `${CLAUDE_PLUGIN_ROOT}/skills/technical-planning/references/`):

| File | When |
|---|---|
| `solution-design.md` | architect: drivers, options and trade-off, contracts, data and migrations, risks, the implementation plan |
| `adr.md` | architect: whether a decision needs an ADR, writing one, superseding one |
| `tickets.md` | pm: plan steps → tickets, slicing and sizing, dependencies, groups, milestones, status updates, the code check's rules |

## Flow

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
qa pre-check maps RTM conditions to tickets → developer builds
```

## The design is ready when

- Every AC of the requirements maps to a component and a plan step; nothing in the plan lacks an AC.
- Contracts (API, events, schema, errors) are written out: request, response, error cases.
- Each plan step names its files and ACs; steps meant to run in parallel touch disjoint files.
- The chosen option names its trade-off; at least one rejected alternative says why not.
- Risks have a mitigation or an owner; anything you could not verify is marked `unverified`.
- A schema or data change has dba's "Data and migrations" rows (expand → backfill → contract, rollback).
- It fits the template Budget (≤ 200 lines; a big item → one file per milestone).

## The tickets are ready when (plan-tickets checks the first seven in code)

| Rule | Code check |
|---|---|
| at least one ticket | `no-tickets` |
| IDs `<KEY>-T<n>` with the item key from the brief, unique | `id-format`, `unique-id` |
| owner is `developer`, `dba` or `devops` | `role` |
| every ticket has files (repo-relative, not under `.git`/`.claude`) and ACs | `files`, `unsafe-path`, `acs` |
| groups are whole numbers from 1 with no gap; milestones whole numbers from 1 | `group`, `group-gap`, `milestone` |
| dependencies exist, are not the ticket itself, sit in an earlier milestone or in an earlier group of the same milestone, and form no cycle | `unknown-dependency`, `self-dependency`, `dependency-order`, `cycle` |
| tickets in the same group and milestone have disjoint files (case-insensitive; a directory contains everything under it) | `file-overlap` |
| one ticket ≈ one plan step, sized S or M (an L is split); summary ≤ 12 words a user can read | pm's judgment, reviewed by the lead |

## Never

- architect: write code or run shell; invent a requirement or an AC (ask ba); copy an ADR into `ARCHITECTURE.md` instead of linking it.
- pm: change requirements or the design (report the conflict); mark a ticket `done` without the evidence the brief gives; put two tickets that share a file in one group.
