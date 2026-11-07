# Quality assurance

> Owner: **qa** (only qa writes this file; everyone reads it).
> One section per work item: test plan, static review, traceability (RTM), execution log per round, defects, test summary. Process: `test-process` skill. Status: `planned` → `executing` → `passed` | `failed` | `blocked`. The gate itself (G2) is recorded by the lead in `.team/STATE.md`.
> Done items move to `.team/archive/QA-<YYYY-MM>.md`. Summaries and evidence pointers only — no long logs, no secrets, no real user data.

## W-000 — <title> · status: planned

### Test plan
- **Scope in / out:** <…>
- **Risks (impact × likelihood → depth):** <risk — H/M/L × H/M/L — techniques / sessions>
- **Quality characteristics:** functional ✔ · interaction/UX ✔ · compatibility <in/light/out — why> · performance <…> · reliability <…> · security basics → security · flexibility (install/upgrade) <…>
- **Levels + types:** <unit / integration / system e2e / live preview; smoke, regression, exploratory, a11y, …>
- **Platforms × form factors:** <web 375/768/1280 · Android small/large phone · …>
- **Test data + environment + drivers:** <seeds, test users, emulator, browser runner — missing: …>
- **Entry criteria:** <defaults from test-process §2 + extra>
- **Exit criteria:** <defaults from test-process §2 + extra>

### Static review findings
- <W-000.AC2 not testable: "fast" has no threshold — analyst>

### Traceability (RTM)
| Condition | Source | Test case / technique | Test file / preview step | R1 | R2 |
|---|---|---|---|---|---|
| Create with valid name | W-000.AC1 | EP valid | e2e/preview/w-000.spec.ts:12 | pass | pass |
| Name 50/51 chars | W-000.E1 | BVA | tests/projects.test.ts:40 | fail (D1) | pass |
| Empty state | DESIGN.md#W-000 state matrix | UX conformance | screenshot w-000-projects-empty.png | pass | pass |

### Execution log
- **R1** <date> · build <sha/working tree> · suite: <command → summary> · live preview: <platforms, errors 0/n> · UX: <conformance n/n, heuristic issues n> · exploratory: <charter, findings> · defects: new n (B/C/M/m/t)

### Defects
| ID | Title | Severity | Priority | Type | Status | Owner | Round |
|---|---|---|---|---|---|---|---|
| W-000-D1 | <…> | major | P1 | functional | closed | developer | R1 → R2 |

### Test summary
<sections from test-process `references/defects-and-reports.md` → Test summary report; verdict>
