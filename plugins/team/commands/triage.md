---
description: "Rank the project's issues in .team/ISSUES.md: qa sets type, severity, priority and area, merges duplicates and flags what needs info; you pick what to fix"
argument-hint: "[file with a loose issue list, or issues pasted inline]"
disable-model-invocation: true
---

# /technical-team:triage

Triage the issues: $ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*. No item, no code changes; one qa spawn.

## When to use

- "Sort / rank / which issue first", or several bugs or issues at once (a list, a file of them).
- Re-run at each milestone close or when `new` rows pile up; with fewer than ~5 open issues, ranking by hand in the reply is cheaper than a spawn.

## Steps

| # | Step | Agent | Gate / verify |
|---|---|---|---|
| 1 | Collect | – | read `.team/ISSUES.md`; missing → create it from `${CLAUDE_PLUGIN_ROOT}/templates/core/ISSUES.md` |
| 2 | Rank | `technical-team:team-qa` with Write `.team/ISSUES.md` and the mode line below | every new or open row has type, severity, priority and area |
| 3 | Report | – | the top rows (P1, then P2) as `I3 (title) · severity · area`, the `needs-info` rows with their question, the duplicates merged |

- **Import** — a file or pasted list in the request → pass it to qa in step 2 to import as `new` rows (the `Next ID` line, then raise it; `Source` = that file or "user"; the user's wording, split only what is clearly two issues). Never edit or delete the source file; offer to after step 3.
- **Mode line** — `QA mode: triage. Static, no test runs. For each new or open row set type, severity, priority and area from its text and the code; merge duplicates into the oldest ID (status duplicate); unclear → needs-info with what is missing. Sort by priority, then severity.` Name the open items' slugs from `STATE.md` under **Constraints** so qa does not rank work already running.
- **Pick** — ask which to fix: each one is `/technical-team:fix I<n>` (a bug) or `/technical-team:feature I<n>` (an enhancement or debt). Do not start one unasked; the pick runs in this session as that pipeline (under `/technical-team:run`, with its workflow opt-in).

## Done when

- The ranked rows are shown and the user picks what to fix; nothing started unasked.
