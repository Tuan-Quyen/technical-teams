---
description: "Documentation: bring product docs back in sync with the code (writer, G4); --adr to record an architecture decision and update .team/ARCHITECTURE.md (architect)"
argument-hint: "[scope] | --adr <decision>"
disable-model-invocation: true
---
# /technical-team:docs — docs (sync · ADR)

## Running this command

Request: $ARGUMENTS

1. With `--adr` and no decision → ask in one short question what to record, then stop. Never guess.
2. If this session is the tech lead (`--agent technical-team:team-lead`), run the Pipeline below yourself. Otherwise call the Agent tool with `subagent_type: technical-team:team-lead` and this prompt:
```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/docs.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied in this conversation, or "none">
Read .team/STATE.md first.
```
   The team cannot see this conversation; "User-provided context" is the only way context reaches it.
3. Show the lead's report as written; do not do the team's work yourself. On `Chờ duyệt …`, stop and wait; never approve or choose for the user.
4. When the user answers, resume the same lead (SendMessage) or start a new Agent call: `Continue W-NNN (docs). User's answer (verbatim): <answer>. Read .team/STATE.md first.`

## Pipeline

_Run by the tech lead with the Lead manual rules (§1 tiers, §2 gates, §3 delivery loop, §4 brief, §7 specialists, §8–§9 reports)._

Modes: no flag → **sync** (writer, G4). `--adr <decision>` (or "ghi ADR", "record decision") → **adr** (architect, no gate).

### Sync

1. (lead) Open W-NNN, pipeline `docs (sync)`.
2. (devops) Only if operations are in scope and `OPS_HANDOFF.md` is empty or stale: record the missing facts, no infra changes.
3. (writer + review specialists) List the docs in scope, compare them with the code, config, scripts and `OPS_HANDOFF.md`, fix what is wrong, fill what is missing, mark what is unverified.
4. (lead) Update `STATE.md` → G4. Report docs changed, discrepancies and unverified items.

### ADR

- A1. (lead) Open W-NNN, pipeline `docs (adr)`.
- A2. (specialists → architect) Affected specialists give their view (`design` hook). The architect writes `.team/adr/NNNN-<title>.md` from the template (`accepted` if the user says it is decided, else `proposed`), marks any superseded ADR and updates `.team/ARCHITECTURE.md`.
- A3. (lead) Update `STATE.md`. Report the ADR path, status and the decision in one sentence.
