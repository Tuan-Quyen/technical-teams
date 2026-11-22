# Solution design and ADRs — architect

> Used by: architect · Read when: a non-trivial design or an ADR

Output: `.team/system-design/<slug>.md` from `templates/design/system-design.md` (Approach · Components and files · Contracts · Data and migrations · Risks · Rejected alternatives · Implementation plan).

## Design

1. **Read first** — the requirements, the frontend design if any, `ARCHITECTURE.md`, `.team/adr/`, and the code on the path (entry points, modules, tests, config), cited `file:line`. Library or platform behaviour → its docs (context7 or the vendor's); a command or flag you cannot run → `unverified`.
2. **Drivers** — name the 2–4 that really constrain this change: functional fit (who owns the behaviour today) · data (entities, ownership, consistency, volume, retention) · performance and scale · reliability (failure modes, retries, idempotency) · security and privacy (authz, sensitive data, trust boundaries) · operability (config, rollout, rollback, observability) · maintainability (fit with existing patterns, test seams).
3. **Options** — at least two for a real decision, the smallest that fits existing patterns first; compare on the drivers only, pick one and name its cost. A new dependency, layer or service must pay for itself by a driver. Each rejected option → one line in **Rejected alternatives**.
4. **Contracts first** — each endpoint, event or schema with request, response, errors (codes, shapes) and its compatibility rule, written before the plan, so parallel tickets depend on contracts, not on each other's code.
5. **Data and migrations** — any schema or data change → brief dba for that section (expand → backfill → contract, lock and duration at real size, rollback per step); order the plan to match (code that reads both shapes before the contract step).
6. **Risks** — one row per real risk: impact and a mitigation (a test, a flag, a staged rollout, a spike) or an owner who decides. A risk that blocks the design → `needs-input` with options.
7. **Implementation plan** — one step per independently testable change, with files, dependencies and ACs; vertical where possible so a step proves an AC by itself; parallel steps touch disjoint files, shared files (routes, registries, schema) go in one step the others depend on. A new project's first milestone is a walking skeleton: build, lint, test runner and one end-to-end slice.

## ADRs

File `.team/adr/NNNN-<decision>.md` from `templates/adr/adr.md`; NNNN from the brief, else the highest in `.team/adr/` + 1.

| Needs an ADR | Does not |
|---|---|
| lasting and costly to reverse (stack, framework, database, protocol) | local to one module and cheap to change |
| a cross-cutting rule (auth model, error format, ID scheme, versioning) | already decided by an ADR (link it) |
| a deliberate exception to an existing pattern or ADR | a detail the system design records well enough |
| a trade-off others will question later | a library choice inside an approved stack, with no lock-in |

- **Context** ≤5 bullets with links · **Decision** 1–3 lines, active voice ("We use X for Y.") · **Alternatives**, each with why it lost on the same drivers · **Consequences**, good and bad, including what becomes harder.
- Status `proposed` until the user accepts it, then `accepted` with the date.
- Never edit an accepted decision: write a new ADR, set the old one `superseded by NNNN` and link back. `ARCHITECTURE.md` links the ADR in force, never copies it.
