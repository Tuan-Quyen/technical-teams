# run-kit §4 · Workspace `.team/`

Every file of the workspace, its one owner and its template, and how to write any of them.

| File | Owner | Template (`${CLAUDE_PLUGIN_ROOT}/templates/…`) |
|---|---|---|
| `STATE.md` — who works on what, files in use, next step (resume point) | the orchestrating session: lead, or whoever spawns agents directly | `core/STATE.md` |
| `TASKS.md` — tickets and status | pm | `core/TASKS.md` |
| `PRODUCT.md` — current truth of the product | ba | `core/PRODUCT.md` |
| `ARCHITECTURE.md` — overview, ~200 lines max, points to ADRs | architect | `core/ARCHITECTURE.md` |
| `requirements/<slug>.md` | ba | `requirements/requirements.md` |
| `system-design/<slug>.md` — design + implementation plan | architect (dba: Data and migrations) | `design/system-design.md` |
| `frontend-design/DESIGN.md` — design system | designer | `design/DESIGN.md` |
| `frontend-design/<slug>.md` | designer | `design/frontend-design.md` |
| `adr/NNNN-<decision>.md` — NNNN given by the lead | architect | `adr/adr.md` |
| `reports/<slug>/qa.md` — profile + scope → checks → findings → latest round → verdict | qa | `reports/qa.md` |
| `reports/<slug>/findings.md` — the item's finding tracker: bug IDs, origin, status, history | the orchestrating session (lead) | `reports/findings.md` |
| `reports/<slug>/review.md` | code-reviewer | `reports/review.md` |
| `reports/<slug>/security.md` | security | `reports/security.md` |
| `reports/<slug>/debug.md` | debugger | `reports/debug.md` |
| `CREW.md` — emoji, names, vibes, badge colors | lead creates it; the user customizes it | `core/CREW.md` |
| `docs/**` | writer | — |
| `archive/<slug>/` — every file of a closed item | lead | — |

Reports keep a cumulative findings table with fixed IDs (`CART-Q1`, `CART-R1`, `CART-S1`) and only the latest round in detail; line 1 is the verdict.

**Writing style (every `.team/` file)** — each file is read by a human skimming and by every agent that starts cold, so length costs tokens on every spawn:
- Bullets and table cells, not paragraphs; one fact per bullet (~20 words); outcome first.
- Point, do not explain: `file:line`, commit, test name, finding or ticket ID, ADR number.
- Current truth only: overwrite stale lines; history lives in git, not in the file.
- One home per fact; elsewhere, link it.
- Each template has a **Budget** line. Count every line, blank ones too: the last line number of a `Read`, or `wc -l` / `(Get-Content f).Count` (not `Measure-Object -Line`, which skips blank lines). Over it → cut, collapse closed rows into an ID line, or split by milestone. When a handoff leaves a file over budget, send it back to its owner before you move on.
