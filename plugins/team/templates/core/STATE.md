# Team state

> Owner: **team-lead** only. Open work only — a closed item's row is removed and its files go to `.team/archive/<slug>/`.
> This file is the resume point: a new or resumed session reads it first and continues at **Next step**.
> **Budget:** ≤ 60 lines. Cells are short phrases; `Next step` ≤ 30 words, the next action only. Overwrite, never append — history is in git.

## Active work

| Slug | Pipeline | Step | Agent | Ticket | Files in use | Status | Next step |
|---|---|---|---|---|---|---|---|
| <kebab-slug> | <feature / fix / review / test / infra / release / new> | <step number + name> | <team-… or "user"> | <T-n or –> | <only the files this step reads/writes> | running / waiting-for-user / blocked / paused | <next action, ≤ 30 words> |

### Notes
<!-- Only what a cold session needs and has no other home: ≤ 5 bullets per item. -->
- <slug>: <fact, e.g. "branch `x` not merged — ask before merging">

## Waiting on the user

| Slug | Question | Options → default | Asked |
|---|---|---|---|
| <slug> | <one line> | <A / B → A> | <YYYY-MM-DD> |

## Counters

- Next ADR number: 0001
