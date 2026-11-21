# Architecture decision records — architect

File: `.team/adr/NNNN-<decision>.md` from `templates/adr/adr.md`; NNNN from the brief, else the highest in `.team/adr/` + 1.

## Does this decision need an ADR?

| Yes, when it is | No, when it is |
|---|---|
| lasting and costly to reverse (stack, framework, database, protocol) | local to one module and cheap to change |
| a cross-cutting rule (auth model, error format, ID scheme, versioning) | already decided by an existing ADR (link it) |
| a deliberate exception to an existing pattern or ADR | a detail the system design records well enough |
| a trade-off others will question later | a library choice inside an approved stack, with no lock-in |

## Writing one

- **Context** ≤ 5 bullets: the forces and constraints, with links (requirements, system design, `file:line`).
- **Decision** 1–3 lines, active voice: "We use X for Y."
- **Alternatives**: each option with its reason it lost, on the same drivers as the design.
- **Consequences**: good and bad, including what becomes harder and what must now be maintained.
- Status `proposed` until the user or the lead's brief accepts it; then `accepted` with the date.

## Superseding

- Never edit an accepted ADR's decision. Write a new ADR; set the old one to `superseded by NNNN` and link back.
- `ARCHITECTURE.md` links the ADR that is in force; it never copies the reasoning.
