---
description: "Infrastructure work: devops proposal (G1) → implement → code-reviewer → security (G3) → runbook (G4)"
argument-hint: "<request>"
disable-model-invocation: true
---
# /technical-team:infra — infra

## Running this command

Request: $ARGUMENTS

1. Empty request → ask in one short question for the infrastructure request, then stop. Never guess.
2. If this session is the tech lead (`--agent technical-team:team-lead`), run the Pipeline below yourself. Otherwise call the Agent tool with `subagent_type: technical-team:team-lead` and this prompt:
```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/infra.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied in this conversation, or "none">
Read .team/STATE.md first.
```
   The team cannot see this conversation; "User-provided context" is the only way context reaches it.
3. Show the lead's report as written; do not do the team's work yourself. On `Chờ duyệt …`, stop and wait; never approve or choose for the user.
4. When the user answers, resume the same lead (SendMessage) or start a new Agent call: `Continue W-NNN (infra). User's answer (verbatim): <answer>. Read .team/STATE.md first.`

## Pipeline

_Run by the tech lead with the Lead manual rules (§1 tiers, §2 gates, §3 delivery loop, §4 brief, §7 specialists, §8–§9 reports)._

Gates G1, G3, G4 (no G2). Security always.

0. (lead) Open W-NNN, pipeline `infra`.
1. (devops + specialists) Proposal only, no file changes: files, tools, environments, verification plan, remote steps for the user, rollback (`design` hook).
2. (lead) **G1** with the proposal, risks and remote commands.
3. (devops + specialists) Implement, verify locally (no remote changes unless enabled), update `OPS_HANDOFF.md` (`execute` hook).
- 4a. (code-reviewer + specialists) Review the diff. Blocking → 3.
- 4b. (security) Review the final diff. Blocking → 3. Clean = **G3**.
5. (writer) Runbooks in `.team/docs/` from `OPS_HANDOFF.md` and the real files → **G4**. Report the exact remote commands for the user, in order, with rollback.

Rules:
- Loop: devops → code-reviewer → security; any change restarts at the code-reviewer.
- Application tests or CI test stages affected → suggest `test`.
- Inside `new`: step 1 comes from the approved MVP plan and step 2 is covered by its G1; anything beyond the plan needs G1 here.
