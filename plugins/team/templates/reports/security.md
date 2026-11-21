Verdict: PASS | FAIL · r<round>

# <slug> — security

> **T2 only.** Below T2 security writes no file: verdict and findings go in its structured output. Owner: **team-security**. PASS = no open blocking finding. Never write secret values.
> Findings live in `.team/items/<slug>.json` (`F1`, `F2`…), each a failing test or repro with a title ≤ 8 words: reference them by ID, never renumber. Current truth only: rewrite in place.
> **Budget:** ≤ 60 lines, every line ≤ 300 characters, cells ≤ 25 words.

## Scope
- In scope: <diff range / paths / whole repo>
- Trust boundaries: <where untrusted input enters, privileges change, sensitive data rests or leaves>
- Scanners: <command → result, or "not available: …">
- Skipped: <what and why, or "none">

## Findings
| ID | Severity | Where | Class | Test or repro of the attack | Fix direction | Status |
|---|---|---|---|---|---|---|
| F1 | blocker / critical / major / minor | `<path:line>` | <injection / authz / secrets …> | <tests/…::name or command> | <direction> | open / fixed / verified |
