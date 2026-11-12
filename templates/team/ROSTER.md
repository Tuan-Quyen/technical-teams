# Specialist roster

> Owner: **hr** (only hr writes this file; the lead reads it at every pipeline).
> A specialist is an agent `team-<name>` in `.claude/agents/`. The lead calls it only when `Status` = `active` **and** `.team/STATE.md` has `HIRE-APPROVED: <name>`.
> `Owns` is a comma-separated list of globs (or `none` for an advisor), carved out of the developer's area; it never overlaps
> `.team/`, docs, infra, tests, dba's data area or another specialist. `Scope` is `project` or `user`.
> Hook points: `design` (Discovery squad, with architect, before G1) · `execute` (Build squad, with or instead of developer) · `test` (Verify squad, with qa, before G2) · `review` (Verify squad, with code-reviewer, before G3).
> Extra skills for a specialist go in `.claude/technical-team.json` → `skills.<name>`.

| Name | Domain | Hook points | Trigger | Owns | Model | Scope | Hired | Last used | Status |
|---|---|---|---|---|---|---|---|---|---|

## Retired

<!-- Rows move here (Status = retired) when you approve a retirement. The agent file is deleted by you. -->
