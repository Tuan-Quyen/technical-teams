# Solution design — architect

Output: `.team/system-design/<slug>.md` from `templates/design/system-design.md` (Approach · Components and files · Contracts · Data and migrations · Risks · Rejected alternatives · Implementation plan).

## 1. Read before designing

- Requirements (`.team/requirements/<slug>.md`), the frontend design if any, `ARCHITECTURE.md`, `.team/adr/`.
- The code the change touches: entry points, the modules on the path, their tests, config. Cite `file:line`; never design against a guess of the code.
- Library or platform behaviour → its docs (context7 or the vendor's); a command or flag you cannot run → `unverified`.

## 2. Drivers — what decides the design

Name the 2–4 that actually constrain this change, from the requirements and the system:

| Driver | Question |
|---|---|
| functional fit | which components own the behaviour today? |
| data | new entities, ownership, consistency, volume, retention |
| performance / scale | expected load, latency budget, hot paths |
| reliability | failure modes, retries, idempotency, partial failure |
| security / privacy | authn/authz, sensitive data, trust boundaries |
| operability | config, migrations, rollout and rollback, observability |
| maintainability | fit with existing patterns, test seams, coupling |

## 3. Options and the trade-off

- At least two options for any real decision; the smallest one that fits existing patterns first.
- Compare on the drivers only; pick one and say what it costs. A new dependency, layer or service must pay for itself by a driver.
- Rejected options go to **Rejected alternatives**, one line why not.

## 4. Contracts first

- Write each contract before the plan: endpoint/event/schema, request, response, errors (codes, shapes), versioning or compatibility rule.
- Parallel tickets depend on contracts, not on each other's code: pin them so frontend and backend tickets can run in one group.

## 5. Data and migrations (with dba)

- Any schema or data change → brief dba for the "Data and migrations" section: expand → backfill → contract, lock and duration at real size, rollback per step.
- The plan orders code and migration steps to match (code that reads both shapes before the contract step).

## 6. Risks

- One row per real risk: impact and a mitigation (a test, a flag, a staged rollout, a spike) or an owner who decides.
- A risk that blocks the design → `needs-input` with options for the user.

## 7. Implementation plan

- One step per independently testable change, each with files, depends on, and ACs.
- Vertical where possible (one behaviour end to end), so a step proves an AC by itself.
- Steps that can run in parallel touch disjoint files; shared files (routes, registries, schema) go in one step that the others depend on.
- New project: the first milestone is a walking skeleton — build, lint, test runner and one end-to-end slice running.
