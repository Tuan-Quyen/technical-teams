# Implementation plans

> Owner: **architect** (only the architect writes this file; everyone reads it).
> One section per work item. Status: `draft` → `done` | `superseded`. Approval (G1) is recorded by the lead in `.team/STATE.md`, not here.
> Long-lived decisions go to `docs/adr/`; the system overview lives in `ARCHITECTURE.md`.
> Done items move to `.team/archive/PLAN-<YYYY-MM>.md`.

## W-000 — <title> · status: draft

**Satisfies:** W-000.AC1, W-000.AC2

**Approach:** <the chosen design in a few sentences>

**Components touched:**
| Area | Files / modules | Change |
|---|---|---|
| backend | `src/...` | <what> |

**Interfaces / contracts:** <API shapes, events, schema changes — the parts frontend and backend must agree on>

**Data & migration:** <none | steps, reversibility>

**Risks:** <risk → mitigation>

**Security-relevant:** yes/no — <auth, user input, data access, secrets, payments, personal data>

**Infra-relevant:** yes/no — <what devops must change>

**Milestones (new projects only):**
| M | Goal (runnable increment) | Satisfies | Exit criteria | Infra in this milestone |
|---|---|---|---|---|
| M1 | walking skeleton: structure, build, lint, test runner, one end-to-end slice, local run | W-000.AC1 | <observable> | <local env> |

**Rejected alternatives:** <option — why not>

**ADRs:** <docs/adr/NNNN-...md or none>
