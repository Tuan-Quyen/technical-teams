---
description: "Hand any request to the tech lead, who picks the tier (T0 single task, T1 small change, T2 feature, TB bug, new project) and runs the matching pipeline"
argument-hint: "<request>"
disable-model-invocation: true
---
# /technical-team:run — run (tier routing)

## Running this command

**Request:** $ARGUMENTS

| Situation | Do |
|---|---|
| Argument required | yes — empty → ask for what the team should do in one short question, stop; never guess |
| This session **is** the tech lead (`--agent technical-team:team-lead` or `agent` setting) | execute the **Pipeline** below yourself |
| Any other session | Agent tool → `subagent_type: technical-team:team-lead`, prompt below |
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

_Executed by the tech lead. Shared rules: Lead manual (tiers §1, gates §2, delivery loop §3, brief §4, specialists §7, reports §8–§9)._

```mermaid
flowchart LR
  A[1 Classify: Lead manual §1] --> B{tier}
  B -- T0 --> C[brief the single owner; G4 if a file changed]
  B -- T1 --> D[feature.md: Small]
  B -- T2 --> E[feature.md: full]
  B -- TB --> F[fix.md: fix / --hotfix / --diagnose]
  B -- new project --> N[new.md]
  A -. expertise missing .-> H[hire.md first]
```

| # | Step |
|---|---|
| 1 | Classify with the tier table (Lead manual §1); tell the user the tier, why, and who will be called |
| 2 | Run it: Read the matching file in `${CLAUDE_PLUGIN_ROOT}/commands/` and follow its Pipeline exactly, in the mode the tier implies (T1 → `feature.md` Small; T2 → `feature.md` full, or plan-only if the user only wants a plan; TB → `fix.md`, `--hotfix` when the user says urgent/production, `--diagnose` when they only want the cause). A whole product from scratch in a repository without application code → `new.md` |
| 3 | Requests that match a read-only or special pipeline go there: review/audit → `review.md`, tests only → `test.md`, infrastructure → `infra.md`, release readiness → `release.md`, docs/ADR → `docs.md` |
| 4 | Expertise nobody on the team or among the specialists has → propose `hire.md` first |
| 5 | The user may switch tier or mode at any time; switch and keep the same work-item ID |
