---
description: "Hand any request to the tech lead, who picks the tier (T0 single task, T1 change, T2 feature, TB bug) and runs the matching pipeline"
argument-hint: "<request>"
disable-model-invocation: true
---
# /technical-team:run — run (tier routing)

## Running this command

**Request:** $ARGUMENTS

| Situation | Do |
|---|---|
| Argument required | yes — empty → ask for what the team should do in one short question, stop; never guess |
| This session **is** the tech lead (`--agent technical-team:lead` or `agent` setting) | execute the **Pipeline** below yourself |
| Any other session | Agent tool → `subagent_type: technical-team:lead`, prompt below |
| Lead returns `Chờ duyệt …` | stop, wait for the user; never approve or choose for them |
| User answers | resume the same lead (SendMessage), or a new Agent call: `Continue W-NNN (run). User's answer (verbatim): <answer>. Read .team/STATE.md first.` |
| Always | show the lead's report as written; do not do the team's work in the main session |

```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/run.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied for this request in this conversation — files, notes, output of skills they ran — or "none">
Read .team/STATE.md first.
```
The lead and its agents cannot see this conversation: "User-provided context" is the only way context you were given reaches the team.

## Pipeline

_Executed by the tech lead. Shared rules: Lead manual (tiers §1, gates §2, delivery loop §3, brief §4, members/specialists §7, reports §8–§9)._

```mermaid
flowchart LR
  A[1 Classify: Lead manual §1] --> B{tier}
  B -- T0 --> C[brief the single owner; G4 if a file changed]
  B -- T1 --> D[commands/change.md]
  B -- T2 --> E[commands/feature.md]
  B -- TB --> F[commands/fix.md or hotfix.md]
  A -. expertise missing .-> H[commands/hire.md first]
```

| # | Step |
|---|---|
| 1 | Classify with the tier table (Lead manual §1); tell the user the tier, why, and who will be called |
| 2 | Run it: Read the matching file in `${CLAUDE_PLUGIN_ROOT}/commands/` and follow its Pipeline exactly (`hotfix.md` when the user says urgent/production) |
| 3 | Expertise nobody on the team, the members or the roster has → propose `hire.md` first |
| 4 | The user may switch tier at any time; switch and keep the same work-item ID |
