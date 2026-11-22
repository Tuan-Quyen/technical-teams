# Task board

> Owner: **team-pm** — sprints, tickets, estimates, progress, risks, status report. Everyone else reads it. Status: todo · doing · blocked · review · done.
> Item = epic: one `##` section per item. Tickets that run in parallel must have disjoint `Files`.
> IDs: `<KEY>-T<n>` ticket · `<KEY>-AC<n>` acceptance criterion; KEY is the item's `key`; the heading starts with the item's label (`[CART] [CHECKOUT]`, see STATE.md) · `S<n>` sprint · `R<n>` risk. Findings (`F1`) live in `.team/items/<slug>.json`, never as tickets. Write an ID with its summary the first time in a line: `CART-T2 (save button)`.
> `Est (d)` is days of real work for a human engineer (an assumption, 0.5-day steps, ≤ 2d per ticket); `Agent time` only from measured time in a status brief (`25m`), `–` until then. Sprint days count `Est (d)`.
> **Budget:** open tickets only, one row each, `Summary` ≤ 12 words. Done tickets collapse into one `Done:` line per item (ID ranges, with their days); closed sprints into one line under Sprints; their detail stays in git.

## Sprints

Current: **S<n>** · <YYYY-MM-DD> → <YYYY-MM-DD> · goal: <one line> · capacity <d>d · committed <d>d · done <d>d
Next: S<n+1> · <YYYY-MM-DD> → <YYYY-MM-DD> · committed <d>d
Closed: <S1 4.5/5d done, carry-over CART-T4 · or "none">

## [<AREA>] [<FEATURE>] <slug> · <KEY> — <title>

| Ticket | Summary | Owner | Files | Depends on | Est (d) | Agent time | Sprint | ACs | Status |
|---|---|---|---|---|---|---|---|---|---|
| CART-T1 | <verb + object, ≤ 12 words> | developer / dba / devops | <paths> | – | 1 | – | S1 | CART-AC1 | todo |

Parallel groups: <CART-T1 ∥ CART-T2; CART-T3 after CART-T1>
Blocked: <<KEY>-T<n> — reason, ≤ 15 words — or "none">
Done: <<KEY>-T<a>..T<b> (<d>d), or "none">

<!-- New projects: group tickets under `### CART-M1 — <milestone>`, `### CART-M2 — …` -->

## Risks

| Risk | Summary | Likelihood | Impact | Owner | Mitigation | Source | Status |
|---|---|---|---|---|---|---|---|
| R1 | <≤ 12 words> | low / med / high | low / med / high | <role> | <≤ 15 words> | <item, ticket, issue or handoff> | open / watching / closed |

## Status report — <YYYY-MM-DD HH:MM> · S<n>

<!-- Latest only (/technical-team:standup); the previous one is in git. Every line cites its source. -->
- Done since last report: <ticket IDs with summaries, or "none">
- In progress / next: <ticket IDs and owners>
- Blockers: <ticket — reason — who unblocks, or "none">
- Risks: <R<n> changes, or "no change">
- Sprint burn: <done>d of <committed>d · <on track / at risk: why>
