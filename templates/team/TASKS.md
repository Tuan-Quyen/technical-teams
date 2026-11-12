# Tasks

> Owner: **team-pm** writes the tickets (tables, parallel groups, notes). **team-lead** changes only the `Status` column, and at closing cuts the item's section out to `.team/archive/<slug>/TASKS.md`. Everyone reads the file.
> Tickets come from an approved `.team/system-design/<slug>.md` (T1: from the expected-behaviour bullets in `.team/STATE.md`). Ticket status: `todo` · `doing` · `blocked` · `review` · `done`. QA work is not recorded here: it lives in `.team/qa/<slug>.md`.

## W-000 — <title>

| Ticket | Summary | Owner role | Files (exclusive) | Depends on | Estimate | Status |
|---|---|---|---|---|---|---|
| W-000-T1 | <what> | developer | `src/...` | – | S | todo |

<!-- Estimate: XS (<1h agent work) · S · M · L (should be split). -->
<!-- "Files (exclusive)" lets the lead run developers in parallel only when the sets do not overlap. -->
<!-- UI tickets also name the Screens + states they deliver; every designed state belongs to exactly one ticket. -->

<!-- New projects (pipeline `new`): group the tickets of one work item under `### M1 — <name>`, `### M2 — <name>`, ... in milestone order; ticket IDs stay W-000-T<n>. -->

**Parallel groups:** <T1, T2 can run together; T3 after T1>

**Notes:** <blockers, re-estimates>

## Follow-ups

<!-- Findings a closed work item left unverified (Lead manual §6, closing step 1). The ticket ID is <W-NNN>-<finding ID>; the detail stays in .team/archive/<slug>/. -->

| Ticket | From | Summary | Severity | Owner role | Status |
|---|---|---|---|---|---|
| W-000-Q-03 | `archive/W-000-<kebab-title>/qa.md` | <what is still wrong> | minor | developer | todo |
