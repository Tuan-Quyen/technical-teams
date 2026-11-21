# Tasks

> Owner: **team-pm** — tickets and status. Everyone else reads it. Status: todo · doing · blocked · review · done.
> Tickets that run in parallel must have disjoint `Files`.
> IDs: `<KEY>-T<n>` ticket · `<KEY>-AC<n>` acceptance criterion; KEY is the item's `key`. Findings (`F1`) live in `.team/items/<slug>.json`, never as tickets. Write an ID with its summary the first time in a line: `CART-T2 (save button)`.
> **Budget:** open tickets only, one row each, `Summary` ≤ 12 words. Done tickets collapse into one `Done:` line per item (ID ranges); their detail stays in git.

## <slug> · <KEY> — <title>

| Ticket | Summary | Owner | Files | Depends on | Size | ACs | Status |
|---|---|---|---|---|---|---|---|
| CART-T1 | <verb + object, ≤ 12 words> | developer / dba / devops | <paths> | – | S / M / L | CART-AC1 | todo |

Parallel groups: <CART-T1 ∥ CART-T2; CART-T3 after CART-T1>
Blocked: <<KEY>-T<n> — reason, ≤ 15 words — or "none">
Done: <<KEY>-T<a>..T<b>, or "none">

<!-- New projects: group tickets under `### CART-M1 — <milestone>`, `### CART-M2 — …` -->
