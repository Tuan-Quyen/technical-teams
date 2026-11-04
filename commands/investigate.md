---
description: "Diagnosis only: the debugger finds the root cause and proposes a fix; no code changes"
argument-hint: "<symptom>"

---
# /technical-team:investigate — investigate

## Running this command

**Request:** $ARGUMENTS

| Situation | Do |
|---|---|
| Argument required | yes — empty → ask for the symptom to investigate in one short question, stop; never guess |
| This session **is** the tech lead (`--agent technical-team:lead` or `agent` setting) | execute the **Pipeline** below yourself |
| Any other session | Agent tool → `subagent_type: technical-team:lead`, prompt below |
| Lead returns `Chờ duyệt …` | stop, wait for the user; never approve or choose for them |
| User answers | resume the same lead (SendMessage), or a new Agent call: `Continue W-NNN (investigate). User's answer (verbatim): <answer>. Read .team/STATE.md first.` |
| Always | show the lead's report as written; do not do the team's work in the main session |

```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/investigate.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied for this request in this conversation — files, notes, output of skills they ran — or "none">
Read .team/STATE.md first.
```
The lead and its agents cannot see this conversation: "User-provided context" is the only way context you were given reaches the team.

## Pipeline

_Executed by the tech lead. Shared rules: Lead manual (tiers §1, gates §2, delivery loop §3, brief §4, members/specialists §7, reports §8–§9)._

| | |
|---|---|
| Gates | none |
| Writes code | no |
| Input | symptom (required) |

```mermaid
flowchart LR
  A[1 Open W-NNN] --> B[2 debugger] --> C{cause in a member's/specialist's domain?}
  C -- yes --> D[confirm with dba / specialist]
  C -- no --> E
  D --> E[3 Record in STATE, done] --> F[Report + suggest fix/hotfix]
```

| # | Step | Agent |
|---|---|---|
| 1 | Open W-NNN (pipeline `investigate`) | lead |
| 2 | Symptom, where it appears, expected behaviour, logs/repro hints from the user. **Hook `design`**: cause in a member's/specialist's domain → one confirmation call | debugger (+ dba / specialist) |
| 3 | Record root cause (one line), evidence, fix direction + risk, regression test idea; work item `done` | lead |

| | |
|---|---|
| .team | reads `STATE`, `SPEC`, `PLAN`, `ROSTER`; writes lead → `STATE` |
| End | final report: root cause, evidence, fix + risk — or "could not reproduce" with what was tried. Suggest `fix` / `hotfix`; do not start it unless asked |
