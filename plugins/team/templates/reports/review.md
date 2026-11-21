Verdict: PASS | FAIL · r<round>

# <slug> — code review

> **T2 only.** Below T2 the reviewer writes no file: verdict and findings go in its structured output. Owner: **team-code-reviewer**. PASS = no open blocking finding.
> Findings live in `.team/items/<slug>.json` (`F1`, `F2`…), each a failing test or repro with a title ≤ 8 words: reference them by ID, never renumber. Current truth only: rewrite in place.
> **Budget:** ≤ 60 lines, every line ≤ 300 characters, cells ≤ 25 words.

## Findings
| ID | Severity | Blocking | Where | Test or repro | Fix direction | Status |
|---|---|---|---|---|---|---|
| F1 | blocker / critical / major / minor | yes / no | `<path:line>` | <tests/…::name or command> | <direction> | open / fixed / verified |

## Checked
- Diff: <range or "working tree"> · files: <n>
- Covered: does what was asked · correctness · contracts · tests · design fit · readability · UI states
- Needs security review: <yes — why / no>
