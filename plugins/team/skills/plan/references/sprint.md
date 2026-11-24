# Sprint planning and the task board

> Used by: orchestrator, pm · Read when: `standup plan`, a sprint plan, status brief, standup or sprint close

Output: the Sprints, Risks and Status report sections of `.team/TASKS.md` from `templates/core/TASKS.md`, and ticket statuses in the items' sections.

## Steps and who takes part

| # | Step | Who | Input → output | Gate |
|---|---|---|---|---|
| 1 | Goal | user (orchestrator asks) | goal or epic, length, capacity → one-line goal; else the board's settings, default 1 week · 5d | goal stated |
| 2 | Backlog | orchestrator | open items (`STATE.md`), `todo` tickets on the board, `ISSUES.md` P1/P2 rows not in an item → candidate list | – |
| 3 | Spec the new epic | ba (+ designer for UI) | a goal or epic with no requirements → open its item and run `feature` steps 1–2 at T2: stories with Must / Should / Could and ACs | ba's questions → the user |
| 4 | Unknowns | architect (+ dba for schema) | new contract, data or stack → `feature` step 3: design and plan steps; an unknown too big to plan → a spike ticket (≤ 1d) and a risk | user OK on the design |
| 5 | Breakdown | pm (`tickets.md`) | `feature` step 4: plan steps → tickets with owner, files, deps, `Est (d)`, ACs; a candidate with no plan (T1 item, issue) → one ticket | the plan-tickets code check |
| 6 | Fit | pm | tickets + priority + capacity → committed scope, not-fit list, critical path, risks | SKILL.md Principle 6 |
| 7 | Commit | user | the plan shown → OK: sprint opens on the board; items wait at step 5 of their pipeline | SKILL.md Principle 5 |

- **Who does the work** — ticket owners are `developer`, `dba` or `devops` only (`tickets.md`). Requirements, design, review, security, qa and docs are pipeline steps of the item, not tickets: their roles join when the item runs.
- **Critical path** — the longest chain of `Depends on` in summed days; it sets the earliest finish. Longer than the sprint → a risk.
- **Issues** — a P1/P2 row enters the sprint as its item (`fix I<n>` or `feature I<n>`) with one ticket estimate; qa keeps the row, pm its priority.
- After the OK, `/technical-team:run` or the item's command builds; a sprint never holds back a pipeline step.

## Sprints

- Time-boxed: a start and end date, a goal (one line) and capacity in days of real work. Length and capacity come from the brief, else the board, else 1 week · 5d; dates from the brief's date, never guessed.
- Planning: SKILL.md Principle 6 (priority, then dependency order, while summed `Est (d)` ≤ capacity); the rest go into the next sprint. A sprint never holds back a pipeline step: work that runs early moves into the sprint it ran in.
- Close: committed vs done days, unfinished tickets carried over by ID, one line under `Closed:`; then open the next sprint.

## Risks and blockers

- A risk is a thing that may happen and hurt the plan (a contract not pinned, a migration on a big table, an unknown API, a ticket over its estimate, a critical path longer than the sprint); each has likelihood, impact, an owner role, a mitigation and its source. No source → not a risk.
- A blocker is a ticket that cannot move now: `blocked` with the reason and who unblocks it. A risk that happens becomes a blocker or an issue.
- Open findings, `waiting-for-user` items and `.team/ISSUES.md` rows of severity blocker/critical are sources; cite them, never copy their detail.

## Status updates

- A board-sync brief carries statuses derived from the item: apply them as its mode line says, nothing more. A standup that finds `TASKS.md` behind an item follows the item.
- A status brief carries handoffs and gate verdicts, not statuses: you decide each ticket's status. `done` only when its evidence holds (developer handoff, review PASS, qa PASS as the pipeline requires); `review` while a gate is open; `Agent time` from the measured time it gives, else `–`.
- `blocked` with a reason ≤ 15 words; done tickets collapse into the `Done:` line (ID ranges), per the template Budget.

## Status report (standup)

- On a standup brief only. Read `STATE.md`, `items/*.json`, `ISSUES.md` and the board; replace the Status report section; every line cites a ticket, item, issue or risk ID.
- Burn = summed `Est (d)` of done tickets of committed days in the current sprint; on track or at risk with the reason.
