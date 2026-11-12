# W-000 — <title> · system design

> Owner: **team-architect** (only the architect writes this file; everyone reads it). Path: `.team/system-design/W-000-<kebab-title>.md`.
> The design for this work item and the plan to implement it. Status: draft → done | superseded. Approval (G1) is recorded by the lead in `.team/STATE.md`, not here.
> Decisions are written only in ADRs (`.team/adr/NNNN-<decision>.md`, number given by the lead); this file names the ADR numbers and never repeats their reasoning. The system overview lives in `.team/ARCHITECTURE.md`.

**Status:** draft

**Satisfies:** W-000.AC1, W-000.AC2

**Approach:** <the chosen design in a few sentences>

**ADRs:** <0007, 0008 — or none>

## Components touched
| Area | Files / modules | Change |
|---|---|---|
| backend | `src/...` | <what> |

## Interfaces and contracts
<API shapes, events, schema changes — the parts frontend and backend must agree on>

## UI implementation
<How the screens and states of `.team/frontend-design/W-000-<kebab-title>.md` are built; delete when there is no UI.>

## Data and migration
<none | steps, reversibility>

## Risks
<risk → mitigation>

## Flags
- **Security-relevant:** yes/no — <auth, user input, data access, secrets, payments, personal data>
- **Infra-relevant:** yes/no — <what devops must change>

## Implementation plan
<Order of work the pm slices into tickets: step → what is true when it is done.>

## Milestones (new projects only)
| M | Goal (runnable increment) | Satisfies | Exit criteria | Infra in this milestone |
|---|---|---|---|---|
| M1 | walking skeleton: structure, build, lint, test runner, one end-to-end slice, local run | W-000.AC1 | <observable> | <local env> |

## Revisions
<!-- Revision <n> — <date> — <why>: what changes, what stays, what happens to work already done, affected tickets, tests and screens. -->
