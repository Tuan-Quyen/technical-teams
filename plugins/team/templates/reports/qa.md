Verdict: PENDING | PASS | FAIL · r<round> · not-run: <ACs or checks, or "none">

# <slug> — QA

> **T2 only.** Below T2 qa writes no file: verdict and findings go in its structured output. Owner: **team-qa**. The pre-check writes the plan and RTM; later runs reuse them and update only the RTM status.
> Findings live in `.team/items/<slug>.json` (`F1`, `F2`…): reference them by ID here, never copy their detail. Current truth only: rewrite in place, no per-run history.
> **Budget:** ≤ 120 lines, every line ≤ 300 characters, cells ≤ 25 words.

## Scope and plan
- Tier: T2 — <one line: the risk that sets it>
- Planning: approved | blocked: <finding IDs with test `spec: …` → owner>
- ACs: <CART-AC1…> · scope out: <…> · platforms: <web 375 / 1280 · …>
- Environments, data, tools: <…>
- Exit: every AC checked · no open blocking finding · suite green · no skipped or weakened test

## RTM
| Condition | Source | Ticket | Level · owner | Test (file::name / preview step) | Status |
|---|---|---|---|---|---|
| <condition> | CART-AC1 / edge / state | CART-T1 | e2e · qa | <tests/…::name> | pass / fail (F1) / not run |

## Non-blocking and separate
- Pre-existing (not this item): <one line each, or "none">
- Enhancements / out of scope (backlog, not defects): <one line each, or "none">

## Residual risk
- <untested area or risk, or "none">

## Decision log
- <YYYY-MM-DD · decision (e.g. scope change and who agreed) · why>, or "none"
