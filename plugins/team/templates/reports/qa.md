Verdict: PENDING | PASS | FAIL | PASS pending design decision · Round <n>

# <slug> — QA

> Owner: **team-qa**. Findings are cumulative: an ID (`Q-01`…) is never reused; status open → fixed → verified (or dropped, with the reason). **Round detail** holds the latest round only: replace it every round.
> **Budget:** ≤ 120 lines. Cells ≤ 25 words; RTM keeps the last 2 round columns. **Round detail** ≤ 12 lines, replaced each round; verified/dropped findings collapse to one `Closed:` line of IDs.

## Test plan
- Scope in / out: <…>
- Risks → depth: <risk — high/medium/low — techniques>
- Levels: <unit / integration / e2e / live preview>
- Platforms × form factors: <web 375 / 1280 · Android small phone · CLI …>
- Data, environment, drivers: <seeds, test users, runner — missing: …>
- Exit criteria: every AC passes · no open in-scope blocker/critical/major · live preview clean · no skipped or weakened test

## Traceability (RTM)
| Condition | Source | Ticket | Test (file:name / preview step) | R1 | R2 |
|---|---|---|---|---|---|
| <condition> | AC1 / E1 / state | T-1 | <tests/…::name> | pass / fail (Q-01) | |

## Findings
| ID | Title | Severity | Owner | Found | Status |
|---|---|---|---|---|---|
| Q-01 | <title> | blocker / critical / major / minor | developer | R1 | open |

Closed: <IDs verified or dropped, or "none">

## Round detail (latest round only)
- Round: R<n> · <YYYY-MM-DD> · build <commit or "working tree">
- Suite: <command → summary line>
- Live preview: <targets × form factors → ok / issues, errors 0/n>
- New or reopened findings: <per ID: steps, expected (with source), actual, evidence>
- Open in-scope blocker + critical + major: <n>
