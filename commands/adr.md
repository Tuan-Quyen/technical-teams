---
description: "Record an architecture decision (ADR) and update ARCHITECTURE.md"
argument-hint: "<decision>"
disable-model-invocation: true
---
# /technical-team:adr — adr

## Running this command

**Request:** $ARGUMENTS

| Situation | Do |
|---|---|
| Argument required | yes — empty → ask for the decision or question to record in one short question, stop; never guess |
| This session **is** the tech lead (`--agent technical-team:lead` or `agent` setting) | execute the **Pipeline** below yourself |
| Any other session | Agent tool → `subagent_type: technical-team:lead`, prompt below |
| Lead returns `Chờ duyệt …` | stop, wait for the user; never approve or choose for them |
| User answers | resume the same lead (SendMessage), or a new Agent call: `Continue W-NNN (adr). User's answer (verbatim): <answer>. Read .team/STATE.md first.` |
| Always | show the lead's report as written; do not do the team's work in the main session |

```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/adr.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied for this request in this conversation — files, notes, output of skills they ran — or "none">
Read .team/STATE.md first.
```
The lead and its agents cannot see this conversation: "User-provided context" is the only way context you were given reaches the team.

## Pipeline

_Executed by the tech lead. Shared rules: Lead manual (tiers §1, gates §2, delivery loop §3, brief §4, specialists §7, reports §8–§9)._

| | |
|---|---|
| Gates | none |
| Input | decision or question (required) |

```mermaid
flowchart LR
  A[1 Open W-NNN] --> B[design hook: affected domains give their view]
  B --> C[2 architect: ADR + supersede + index + ARCHITECTURE.md]
  C --> D[3 STATE] --> E[Report]
```

| # | Step | Agent |
|---|---|---|
| 1 | Open W-NNN (pipeline `adr`) | lead |
| 2 | **Hook `design`**: specialists whose domain is affected (e.g. dba for data decisions) give their view first. Then `docs/adr/NNNN-<kebab-title>.md` from the template; status `accepted` if the user says the decision is made, else `proposed`; superseded ADR → `superseded by NNNN`; update the index and affected sections of `ARCHITECTURE.md` | specialists → architect |
| 3 | Update `STATE.md` | lead |

| | |
|---|---|
| .team | reads `STATE`, `ARCHITECTURE.md`, `docs/adr/`, `ROSTER`; writes lead → `STATE` |
| End | final report: ADR path, status, decision in one sentence; if `proposed`, what the user must confirm |
