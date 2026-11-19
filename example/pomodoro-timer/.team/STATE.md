# Team state

> Owner: the orchestrating session only — **team-lead** in a pipeline, or whoever spawns team agents directly (run-kit § Orchestrating without the lead). Spawned agents never write it. Open work only — a closed item's row is removed and its files go to `.team/archive/<slug>/`.
> This file is the resume point: a new or resumed session reads it first and continues at **Next step**.
> **Budget:** ≤ 60 lines. Cells are short phrases; `Next step` ≤ 30 words, the next action only. Overwrite, never append — history is in git.

## Active work

| Slug | Pipeline | Step | Agent | Ticket | Files in use | Status | Next step |
|---|---|---|---|---|---|---|---|

## Waiting on the user

| Slug | Question | Options → default | Asked |
|---|---|---|---|

## Counters

- Next ADR number: 0002
