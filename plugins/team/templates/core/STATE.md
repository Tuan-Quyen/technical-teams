# Team state

> Owner: **team-lead** only. Open work only — a closed item's row is removed and its files go to `.team/archive/<slug>/`.
> This file is the resume point: a new or resumed session reads it first and continues at **Next step**.

## Active work

| Slug | Pipeline | Step | Agent | Ticket | Files in use | Status | Next step |
|---|---|---|---|---|---|---|---|
| <kebab-slug> | <feature / fix / review / test / infra / release / new> | <step number + name> | <team-… or "user"> | <T-n or –> | <only the files this step reads/writes> | running / waiting-for-user / blocked | <what to do next, precise enough to resume cold> |

## Waiting on the user

| Slug | Question | Asked |
|---|---|---|
| <slug> | <question, options, default> | <YYYY-MM-DD> |

## Counters

- Next ADR number: 0001
