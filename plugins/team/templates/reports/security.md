Verdict: PASS | FAIL · Round <n>

# <slug> — security

> Owner: **team-security**. PASS = no `open` blocking finding. Findings are cumulative: an ID (`S-01`…) is never reused; status open → fixed → verified (or dropped, with the reason). Never write secret values.
> **Budget:** ≤ 80 lines. Cells ≤ 25 words. **Round detail** ≤ 8 lines, replaced each round; verified/dropped findings collapse to one `Closed:` line of IDs.

## Scope
- In scope: <diff range / paths / whole repo>
- Trust boundaries: <where untrusted input enters, privileges change, sensitive data is stored or leaves>
- Scanners: <command → result, or "not available: …">
- Skipped: <what and why, or "none">

## Findings
| ID | Severity | Where | Class | Attack scenario | Fix direction | Found | Status |
|---|---|---|---|---|---|---|---|
| S-01 | blocking / should-fix / suggestion | `<path:line>` | <injection / authz / secrets …> | <how it is exploited> | <direction> | R1 | open |

Closed: <IDs verified or dropped, or "none">

## Round detail (latest round only)
- Round: R<n> · <YYYY-MM-DD> · <full review or delta since R<n-1>>
- Open blocking: <n>
