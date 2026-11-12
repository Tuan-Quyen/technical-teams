---
description: "Hand any request to the tech lead, who picks the tier (T0 single task, T1 small change, T2 feature, TB bug, new project) and runs the matching pipeline"
argument-hint: "<request>"
disable-model-invocation: true
---
# /technical-team:run — run (tier routing)

## Running this command

Request: $ARGUMENTS

1. Empty request → ask in one short question what the team should do, then stop. Never guess.
2. If this session is the tech lead (`--agent technical-team:team-lead`), run the Pipeline below yourself. Otherwise call the Agent tool with `subagent_type: technical-team:team-lead` and this prompt:
```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/run.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied in this conversation, or "none">
Read .team/STATE.md first.
```
   The team cannot see this conversation; "User-provided context" is the only way context reaches it.
3. Show the lead's report as written; do not do the team's work yourself. On `Chờ duyệt …`, stop and wait; never approve or choose for the user.
4. When the user answers, resume the same lead (SendMessage) or start a new Agent call: `Continue W-NNN (run). User's answer (verbatim): <answer>. Read .team/STATE.md first.`

## Pipeline

_Run by the tech lead with the Lead manual rules (§1 tiers, §2 gates, §3 delivery loop, §4 brief, §7 specialists, §8–§9 reports)._

1. Classify with the tier list (Lead manual §1); tell the user the tier, why, and who will be called.
2. Read the matching file in `${CLAUDE_PLUGIN_ROOT}/commands/` and follow its Pipeline: T1 → `feature.md` Small; T2 → `feature.md` full (or plan-only); TB → `fix.md` (`--hotfix` urgent, `--diagnose` cause only); a whole new product → `new.md`.
3. Special requests go to their pipeline: review/audit → `review.md`, tests → `test.md`, infrastructure → `infra.md`, release → `release.md`, docs/ADR → `docs.md`.
4. Expertise nobody has → propose `hire.md` first.
5. The user may switch tier or mode at any time; keep the same work-item ID.
