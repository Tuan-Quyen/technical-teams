# <slug> — system design

Status: draft | approved

## Approach
<how the change fits the system, in a few sentences>

## Components and files
| Area | Files | Change |
|---|---|---|
| <backend / frontend / data / infra> | <paths> | <what changes> |

## Contracts
- <API endpoint / event / schema: request, response, errors>

## Data and migrations
<!-- Written by team-dba when schema or data changes; otherwise "none". -->
| # | Release | Migration | Lock + duration | Rollback |
|---|---|---|---|---|
| 1 | <expand / backfill / contract> | <statement> | <lock, time at real size> | <down> |

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| <risk> | <impact> | <mitigation> |

## Rejected alternatives
- <option> — <why not>

## Implementation plan
| Step | What | Files | Depends on | ACs |
|---|---|---|---|---|
| 1 | <step> | <paths> | – | AC1 |

<!-- team-pm turns these steps into tickets in .team/TASKS.md. -->
