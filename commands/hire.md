---
description: "Recruit a domain specialist through hr, with a hiring approval gate (into the plugin when working in the technical-team repo); --roster to review the specialist roster (retirement approval)"
argument-hint: "<domain or need> [why] | --roster"
disable-model-invocation: true
---
# /technical-team:hire — hire (recruit · roster)

## Running this command

Request: $ARGUMENTS

1. Empty request → ask in one short question for the domain or need (and why), then stop. Never guess.
2. If this session is the tech lead (`--agent technical-team:team-lead`), run the Pipeline below yourself. Otherwise call the Agent tool with `subagent_type: technical-team:team-lead` and this prompt:
```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/hire.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied in this conversation, or "none">
Read .team/STATE.md first.
```
   The team cannot see this conversation; "User-provided context" is the only way context reaches it.
3. Show the lead's report as written; do not do the team's work yourself. On `Chờ duyệt …`, stop and wait; never approve or choose for the user.
4. When the user answers, resume the same lead (SendMessage) or start a new Agent call: `Continue W-NNN (hire). User's answer (verbatim): <answer>. Read .team/STATE.md first.`
5. When the user approves the hire, relay it in the **foreground** (not `run_in_background`): the guard turns the lead's `HIRE-APPROVED` write into a permission prompt, and the user's Allow is the approval.

## Pipeline

_Run by the tech lead with the Lead manual rules (§1 tiers, §2 gates, §3 delivery loop, §4 brief, §7 specialists, §8–§9 reports)._

Modes: no flag → **recruit** (hiring gate). `--roster` (or "xem danh bạ", "rà soát specialist") → **roster** review (retirement gate only if proposed).

Where a hire goes: in the technical-team plugin repo → `agents/<name>.md` + `config/agents.json` (plugin specialist, active after `/reload-plugins`). In any other project → `.claude/agents/<name>.md` + a `.team/ROSTER.md` row, valid only with `HIRE-APPROVED: <name>` in `STATE.md`.

### Recruit

0. (lead) Open W-NNN, pipeline `hire (recruit)`. Check core roles, `config/agents.json` and the roster; decide plugin or project.
1. (hr) Is the need real? Covered already → stop with "no hire". Otherwise a domain profile with sources, a specialist profile draft and placement questions.
2. (architect ∥ pm ∥ closest role) Answer the placement questions only; write nothing.
3. (hr) Consolidate the answers into one proposal with any disagreements.
4. (lead) Least-privilege check: no `Agent` tool, write scope does not overlap others, Write/Edit/Bash justified, `run-kit` preloaded, name not confusable with a core role.
5. (lead) **Hiring gate**: need, profiles, placement, disagreements, where it goes, settings the user must add.
6. (lead → hr → writer) Approved → the lead writes `HIRE-APPROVED: <name> (<date>, scope)` in `STATE.md`; the guard asks the user to confirm. Denied → not approved, stop. Allowed → hr creates the agent file and the entry/row; in the plugin repo the writer updates README.
7. (lead) Read the file and entry; they must match the approval. Report and tell the user how to activate it.

### Roster

- R1. (lead) Open W-NNN, pipeline `hire (roster)`. Show plugin and active project specialists from `ROSTER.md`, `config/agents.json` and "Specialist usage" in `STATE.md`.
- R2. (lead) No active project specialists → report and stop.
- R3. (hr) Review: unused (60 days, or never used 30 days after hire), overlapping, too wide, outdated.
- R4. (lead → hr) Proposals → gate. Approved retirement → hr moves the row to "Retired"; the user deletes the file. Profile changes go through recruit.
