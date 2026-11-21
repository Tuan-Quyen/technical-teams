Verdict: PENDING | PASS | FAIL | PASS pending design decision · Round <n> · Profile <T0 | T1 | T2> · QA-Fix round <n>/3 (as given from STATE.md)

# <slug> — QA

> Owner: **team-qa**. Pre-check (R0) fixes profile, scope and plan; execution rounds (R1…) reuse them, never rebuild them. Findings use the item's tracker IDs (`CART-B1`…, `.team/reports/<slug>/findings.md`): never renumbered, kept when title, file or line change; `Q-` IDs only as a cross-reference. **Round detail** holds the latest round only. T0/T1: drop the RTM table (a checklist is enough) and keep every section short.
> **Budget:** ≤ 120 lines (T0 ≤ 30, T1 ≤ 60). Cells ≤ 25 words; RTM keeps the last 2 round columns; verified/dropped findings collapse to one `Closed:` line of IDs.

## Profile and approved scope
- Profile: <T0 / T1 / T2> — <one line: the risk that sets it> · approved R0 <YYYY-MM-DD> (or round 1 with no pre-check)
- Planning: approved | blocked: <spec-issue IDs → owner> | accepted by the user <date: quote>
- ACs and conditions: <AC ids, or the brief bullets> · scope out: <…> · platforms: <web 375 / 1280 · …>
- Exit: approved conditions pass · no open in-scope blocking finding · regression green · no skipped or weakened test
- Changes after approval: <proposal → who agreed, or "none">

## Checks (T0/T1 checklist · T2 RTM)
| Condition | Source | Ticket | Level · owner | Test (file:name / preview step) | R1 | R2 |
|---|---|---|---|---|---|---|
| <condition> | CART-AC1 / CART-E1 / state | CART-T1 | e2e · qa | <tests/…::name> | pass / fail (CART-B1) | |

## Blocking findings
| ID | Title | Severity | Basis | Owner | Found | Status |
|---|---|---|---|---|---|---|
| CART-B1 | <title> | blocker / critical / major | ac-violation / regression / fix-caused / critical-risk | developer | R1 | OPEN / FIXED_PENDING_RETEST / REOPENED |

Each blocking ID in **Round detail** (when new or reopened): steps · expected (source) · actual · evidence · violates · impact · why this severity.

## Non-blocking and separate
- Minor / trivial (lead fixes or defers): <IDs + title, or "none">
- Deferred by the lead: <IDs, or "none">
- Pre-existing (not this task; new work item): <IDs, or "none">
- Enhancements / out of scope (backlog, not defects): <one line each, or "none">
- Closed: <IDs verified or dropped, or "none">

## Round detail (latest round only)
- Round: R<n> · <YYYY-MM-DD> · build <commit or "working tree"> · mode pre-check / first run / retest
- Scope: planned <…> · executed <…> · deviations <…, or "none"> · exploratory none / planned / expanded (approved by the lead: <quote>)
- Developer evidence: <ok, or missing: …>
- Results: <command → summary line> · live preview: <targets → ok / issues, or "not run: why">
- Retest + regression: <fixed IDs → verified / reopened; area regressed → result>
- New or reopened findings: <per ID: the blocking fields above>
- Residual risk / untested: <…, or "none">
