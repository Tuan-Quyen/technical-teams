# Team state

> Owner: the orchestrating session only — **team-lead** in a pipeline, or whoever spawns team agents directly (run-kit § Orchestrating without the lead). Spawned agents never write it. Open work only — a closed item's row is removed and its files go to `.team/archive/<slug>/`.
> This file is the resume point: a new or resumed session reads it first and continues at **Next step**.
> **Budget:** ≤ 60 lines. Cells are short phrases; `Next step` ≤ 30 words, the next action only. Overwrite, never append — history is in git.

## Active work

| Slug | Key | Pipeline | Step | Agent | Ticket | Files in use | Status | Workflows | Next step |
|---|---|---|---|---|---|---|---|---|---|
| <kebab-slug> | <KEY: 2-6 capitals, e.g. CART> | <feature / fix / review / test / infra / release / new / direct> | <step number + name> | <team-… or "user"> | <<KEY>-T<n> or –> | <only the files this step reads/writes> | running / waiting-for-user / blocked / paused | yes / no | <next action, ≤ 30 words> |

### Notes
<!-- Only what a cold session needs and has no other home: ≤ 5 bullets per item. -->
- <slug>: <fact, e.g. "branch `x` not merged — ask before merging">

## QA-Fix state

The canonical QA-Fix state of each item with a build loop: one row, all cells written together from the last result's `state` (run-kit §3 *QA-Fix round*). Never reset, never edited by hand.

| Slug | Key | Fix rounds | Last bug no. | Review fixes |
|---|---|---|---|---|
| <slug> | <item key, e.g. CART> | <QA-Fix round, from 0> | <highest bug number issued (CART-B7 → 7), from 0> | <review-fix cycles in this QA-Fix round, 0–3> |

The cap (3) is not here: it is code (`ROUND_CAP` in the workflows), and no cell, report or record can raise it.

## Approvals (audit log)

One row per inline QA-Fix round past 3, written by the top-level session after the user's own answer in that session (run-kit §3 *More than 3 rounds*). A log, never permission: no workflow and no lead reads a row here as approval.

| Slug | Round | Scope | Reason | User's reply (verbatim) | Date |
|---|---|---|---|---|---|
| <slug> | <4> | <findings and files the round may touch> | <why another cycle> | <"approve <slug> round 4 …"> | <YYYY-MM-DD> |

## Waiting on the user

| Slug | Question | Options → default | Asked |
|---|---|---|---|
| <slug> | <one line> | <A / B → A> | <YYYY-MM-DD> |

## Counters

- Next ADR number: 0001
