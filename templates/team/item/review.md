Verdict: FAIL · Round 1

# W-000 — <title> · code review

> Owner: **team-code-reviewer** (only the code reviewer writes this file; everyone reads it). Path: `.team/reports/W-000-<kebab-title>/review.md`.
> Line 1 is the verdict of the latest round: `Verdict: PASS | FAIL · Round N`. PASS = no blocking finding is `open`. The gate itself (G3) is recorded by the lead in `.team/STATE.md`.
> The findings table is cumulative: an ID (`R-01`, `R-02`…) is never reused or renumbered; status `open` → `fixed` → `verified` (or `dropped` with the reason). The Round detail section holds the latest round only: replace it every round.

## Findings
| ID | Severity | Where | What is wrong | Found | Status |
|---|---|---|---|---|---|
| R-01 | blocking | `src/x.ts:42` | <one line> | R1 | open |

<!-- Severity: blocking (Chặn merge) · should-fix (Nên sửa) · suggestion (Gợi ý). -->

## Round detail (latest round only)
- **Round:** R<n> · <date> · diff: <range or "working tree"> · files reviewed: <n>
- **Checked:** plan + ACs · correctness · contracts · tests · design fit · readability · UI states
- **Per new or still-open finding:** ID — why it matters — fix direction
- **Blocking findings open:** <n>
