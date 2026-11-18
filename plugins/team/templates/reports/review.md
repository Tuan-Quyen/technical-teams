Verdict: PASS | FAIL · Round <n>

# <slug> — code review

> Owner: **team-code-reviewer**. PASS = no `open` blocking finding. Findings are cumulative: an ID (`R-01`…) is never reused; status open → fixed → verified (or dropped, with the reason). **Round detail** holds the latest round only.
> **Budget:** ≤ 80 lines. Cells ≤ 25 words. **Round detail** ≤ 8 lines, replaced each round; verified/dropped findings collapse to one `Closed:` line of IDs.

## Findings
| ID | Severity | Where | What is wrong | Fix direction | Found | Status |
|---|---|---|---|---|---|---|
| R-01 | blocking / should-fix / suggestion | `<path:line>` | <problem and why it matters> | <direction> | R1 | open |

Closed: <IDs verified or dropped, or "none">

## Round detail (latest round only)
- Round: R<n> · <YYYY-MM-DD> · diff: <range or "working tree"> · files: <n>
- Checked: does what was asked · correctness · contracts · tests · design fit · readability · UI states
- Open blocking: <n>
- Needs security review: <yes — why / no>
