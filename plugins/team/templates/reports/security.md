Verdict: PASS | FAIL · Round <n>

# <slug> — security

> Owner: **team-security**. PASS = no `open` blocking finding. Findings are cumulative: an ID (`S-01`…) is never reused; status open → fixed → verified (or dropped, with the reason). Never write secret values.

## Scope
- In scope: <diff range / paths / whole repo>
- Trust boundaries: <where untrusted input enters, privileges change, sensitive data is stored or leaves>
- Scanners: <command → result, or "not available: …">
- Skipped: <what and why, or "none">

## Findings
| ID | Severity | Where | Class | Attack scenario | Fix direction | Found | Status |
|---|---|---|---|---|---|---|---|
| S-01 | blocking / should-fix / suggestion | `<path:line>` | <injection / authz / secrets …> | <how it is exploited> | <direction> | R1 | open |

## Round detail (latest round only)
- Round: R<n> · <YYYY-MM-DD> · <full review or delta since R<n-1>>
- Open blocking: <n>
