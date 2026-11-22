---
description: "Rank the project's issues in .team/ISSUES.md: qa sets type, severity, priority and area, merges duplicates and flags what needs info; you pick what to fix"
argument-hint: "[file with a loose issue list, or issues pasted inline]"
disable-model-invocation: true
---

Triage the issues: $ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` (Rules, §4 Brief) — Read it if you are not already the lead. No item, no code changes; one qa spawn.

1. **Collect** — read `.team/ISSUES.md`; missing → create it from `${CLAUDE_PLUGIN_ROOT}/templates/core/ISSUES.md`. A file or pasted list in the request → add each issue in it as a `new` row (the `Next ID` line, then raise it; `Source` = that file or "user"); keep the user's wording, split only what is clearly two issues. Never edit or delete the source file; offer to after step 3.
2. **Rank** — `technical-team:team-qa` with Write `.team/ISSUES.md` and the line `QA mode: triage. Static, no test runs. For each new or open row set type, severity, priority and area from its text and the code; merge duplicates into the oldest ID (status duplicate); unclear → needs-info with what is missing. Sort by priority, then severity.` Name the open items' slugs from `STATE.md` under **Constraints** so qa does not rank work already running.
3. **Report** — the top rows (P1, then P2) as `I3 (title) · severity · area`, the `needs-info` rows with their question, the duplicates merged. Ask which to fix: each one is `/technical-team:fix I<n>` (a bug) or `/technical-team:feature I<n>` (an enhancement or debt). Do not start one unasked; the pick runs in this session as that pipeline (under `/technical-team:run`, with its workflow opt-in).

Re-run at each milestone close or when `new` rows pile up; with fewer than ~5 open issues, ranking by hand in the reply is cheaper than a spawn.
