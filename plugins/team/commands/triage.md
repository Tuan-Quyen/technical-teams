---
description: "Rank the project's issues in .team/ISSUES.md: qa sets type, severity and area, merges duplicates and flags what needs info; ba (and architect, security when needed) advise; pm sets priority; you pick what to fix"
argument-hint: "[file with a loose issue list, or issues pasted inline]"
disable-model-invocation: true
---

# /technical-team:triage

Triage the issues: $ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*. No item, no code changes; qa, then advisers in parallel, then pm.

## When to use

- "Sort / rank / which issue first", or several bugs or issues at once (a list, a file of them).
- Re-run at each milestone close or when `new` rows pile up; with fewer than ~5 open issues, ranking by hand in the reply is cheaper than a spawn.

## Steps

| # | Step | Agent | Gate / verify |
|---|---|---|---|
| 1 | Collect | – | read `.team/ISSUES.md`; missing → create it from `${CLAUDE_PLUGIN_ROOT}/templates/core/ISSUES.md` |
| 2 | Assess | `technical-team:team-qa` with Write `.team/ISSUES.md` and the mode line below | every new or open row has type, severity and area; duplicates merged |
| 3 | Advise | `technical-team:team-ba` ∥ `technical-team:team-architect` (∥ `technical-team:team-security`), each Write: none | ba: business impact per row (AC, BR or user flow hit; Must / Should / Could). architect: effort (d) and fix risk, only for rows that are not obvious one-file fixes. security: only rows touching auth, user data, secrets or payments: exploitable or not |
| 4 | Prioritise | `technical-team:team-pm` with Write `.team/ISSUES.md` (Priority column and row order only), the pm line below and the advisers' answers verbatim | every new or open row has a priority; each P1 has a one-line reason |
| 5 | Report | – | the top rows (P1, then P2) as `I3 (title) · severity · priority · area`, the `needs-info` rows with their question, the duplicates merged |

- **Import** — a file or pasted list in the request → pass it to qa in step 2 to import as `new` rows (the `Next ID` line, then raise it; `Source` = that file or "user"; the user's wording, split only what is clearly two issues). Never edit or delete the source file; offer to after step 5.
- **Mode line** — `QA mode: triage. Static, no test runs. For each new or open row set type, severity and area from its text and the code; merge duplicates into the oldest ID (status duplicate); unclear → needs-info with what is missing. Leave Priority as it is: pm sets it next.` Name the open items' slugs from `STATE.md` under **Constraints** so qa does not rank work already running.
- **Skip advisers** — no row new or changed in step 2 → skip steps 3–4; a `needs-info` row gets no adviser.
- **pm line** — `PM mode: triage. Set Priority (P1 next · P2 this milestone · P3 backlog) for each new or open row from qa's severity, ba's impact, architect's effort and risk, security's call and the board's capacity; never change another column. Severity is not priority: a rare blocker can be P2, a common minor P1. Sort the rows by priority, then severity.`
- **Pick** — ask which to fix: each one is `/technical-team:fix I<n>` (a bug) or `/technical-team:feature I<n>` (an enhancement or debt). Do not start one unasked; the pick runs in this session as that pipeline (under `/technical-team:run`, with its workflow opt-in).

## Done when

- The ranked rows are shown and the user picks what to fix; nothing started unasked.
