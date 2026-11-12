Verdict: PENDING · Round 0

# W-000 — <title> · QA

> Owner: **team-qa** (only qa writes this file; everyone reads it). Path: `.team/qa/W-000-<kebab-title>.md`.
> Line 1 is the verdict of the latest round: `Verdict: PASS | FAIL · Round N` (`PENDING · Round 0` until the first execution round). The gate itself (G2) is recorded by the lead in `.team/STATE.md`.
> The findings table is cumulative: an ID (`Q-01`, `Q-02`…) is never reused or renumbered; status `open` → `fixed` → `verified` (or `dropped` with the reason). The Round detail section holds the latest round only: replace it every round.
> Summaries and evidence pointers — no long logs, no secrets, no real user data.

## Test plan
- **Tier + depth:** <T2 full | T1 small | fix | hotfix> (test-process §2a)
- **Scope in / out:** <…>
- **Risks (impact × likelihood → depth):** <risk — H/M/L × H/M/L — techniques / sessions>
- **Quality characteristics:** functional ✔ · interaction/UX ✔ · compatibility <in/light/out — why> · performance <…> · reliability <…> · security basics → security · flexibility (install/upgrade) <…>
- **Levels + types:** <unit / integration / system e2e / live preview; smoke, regression, exploratory, a11y, …>
- **Platforms × form factors:** <web 375/768/1280 · Android small/large phone · …>
- **Test data + environment + drivers:** <seeds, test users, emulator, browser runner — missing: …>
- **Entry criteria:** <defaults from test-process §2 + extra>
- **Exit criteria:** <defaults from test-process §2 + extra> — locked at G1; later changes only with lead approval

## Static review findings
- <W-000.AC2 not testable: "fast" has no threshold — ba>

## Traceability (RTM)
| Condition | Source | Ticket | Test case / technique | Test file / preview step | R1 | R2 |
|---|---|---|---|---|---|---|
| Create with valid name | W-000.AC1 | W-000-T2 | EP valid | e2e/preview/w-000.spec.ts:12 | pass | pass |
| Name 50/51 chars | W-000.E1 | W-000-T2 | BVA | tests/projects.test.ts:40 | fail (Q-01) | pass |
| Empty state | frontend-design state matrix | W-000-T3 | UX conformance | screenshot w-000-projects-empty.png | pass | pass |

## Findings
| ID | Title | Severity | Priority | Type | Scope | Owner | Found | Status |
|---|---|---|---|---|---|---|---|---|
| Q-01 | <…> | major | P1 | functional | in-scope | developer | R1 | verified (R2) |

## Round detail (latest round only)
- **Round:** R<n> · <date> · build <sha/working tree>
- **Suite:** <command → summary line>
- **Live preview:** <platforms × form factors, errors 0/n>
- **UI/UX:** <conformance n/n, heuristic issues n>
- **Exploratory:** <charter, findings>
- **Open in-scope blocker + critical + major:** <n> · pre-existing: <n>
- **Finding reports of this round:** <full report per new or reopened finding — format in test-process `references/defects-and-reports.md`>

## Test summary
<written in the passing round and at `release`: sections from test-process `references/defects-and-reports.md` → Test summary report>
