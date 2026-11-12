---
description: "QA adds missing tests against acceptance criteria and runs them (G2)"
argument-hint: "[scope]"
disable-model-invocation: true
---
# /technical-team:test — test (G2)

## Running this command

Request: $ARGUMENTS

1. No argument needed (optional scope).
2. If this session is the tech lead (`--agent technical-team:team-lead`), run the Pipeline below yourself. Otherwise call the Agent tool with `subagent_type: technical-team:team-lead` and this prompt:
```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/test.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied in this conversation, or "none">
Read .team/STATE.md first.
```
   The team cannot see this conversation; "User-provided context" is the only way context reaches it.
3. Show the lead's report as written; do not do the team's work yourself. On `Chờ duyệt …`, stop and wait; never approve or choose for the user.
4. When the user answers, resume the same lead (SendMessage) or start a new Agent call: `Continue W-NNN (test). User's answer (verbatim): <answer>. Read .team/STATE.md first.`

## Pipeline

_Run by the tech lead with the Lead manual rules (§1 tiers, §2 gates, §3 delivery loop, §4 brief, §7 specialists, §8–§9 reports)._

Gate G2. No production code is written.

1. (lead) Open or reuse W-NNN, pipeline `test`. Scope: given, or work items with code changes but no G2; otherwise ask.
2. (lead) Pick the criteria source, the first that exists: `SPEC.md#W-NNN` ACs → expected-behaviour bullets in `STATE.md` → documented behaviour → current behaviour (qa lists what it assumed for the user to confirm).
3. (qa ∥ test specialists) Test plan, RTM, missing tests, run, defects and test summary in `TASKS.md#W-NNN` → `### QA`; live preview of the observable behaviour; QA fan-out when ≥ 2 independent platforms.
4. (lead) G2 verdict. Failures caused by production code are reported as bugs with one suggested `fix` each, not fixed here.
