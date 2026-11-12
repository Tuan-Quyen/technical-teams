Verdict: FAIL · Round 1

# W-000 — <title> · security review

> Owner: **team-security** (only security writes this file; everyone reads it). Path: `.team/reports/W-000-<kebab-title>/security.md`.
> Line 1 is the verdict of the latest round: `Verdict: PASS | FAIL · Round N`. PASS = no blocking finding is `open`. The gate itself (G3) is recorded by the lead in `.team/STATE.md`.
> The findings table is cumulative: an ID (`S-01`, `S-02`…) is never reused or renumbered; status `open` → `fixed` → `verified` (or `dropped` with the reason). The Round detail section holds the latest round only: replace it every round.
> Never a secret value: name the file, the line and the kind.

## Findings
| ID | Severity | Class | Where | What is wrong | Found | Status |
|---|---|---|---|---|---|---|
| S-01 | blocking | authorization / IDOR | `src/api/orders.ts:88` | <one line> | R1 | open |

<!-- Severity: blocking (Chặn merge) · should-fix (Nên sửa) · suggestion (Gợi ý). -->

## Round detail (latest round only)
- **Round:** R<n> · <date> · scope: <diff range | delta since R1 | whole repo> · files seen: <list or count>
- **Trust boundaries:** <where untrusted input enters, privileges change, sensitive data is stored or leaves>
- **Scanners:** <command → summary; missing: …>
- **Per new or still-open finding:** ID — attack scenario — fix direction
- **Covered / skipped:** <…>
- **Blocking findings open:** <n>
