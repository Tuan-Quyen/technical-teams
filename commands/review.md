---
description: "Read-only review: code-reviewer ∥ security on a diff merged into one G3 verdict; --audit for a full security audit of the repository or a scope"
argument-hint: "[diff scope] | --audit [scope]"
disable-model-invocation: true
---
# /technical-team:review — review (diff · audit)

## Running this command

Request: $ARGUMENTS

1. No argument needed.
2. If this session is the tech lead (`--agent technical-team:team-lead`), run the Pipeline below yourself. Otherwise call the Agent tool with `subagent_type: technical-team:team-lead` and this prompt:
```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/review.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied in this conversation, or "none">
Read .team/STATE.md first.
```
   The team cannot see this conversation; "User-provided context" is the only way context reaches it.
3. Show the lead's report as written; do not do the team's work yourself. On `Chờ duyệt …`, stop and wait; never approve or choose for the user.
4. When the user answers, resume the same lead (SendMessage) or start a new Agent call: `Continue W-NNN (review). User's answer (verbatim): <answer>. Read .team/STATE.md first.`

## Pipeline

_Run by the tech lead with the Lead manual rules (§1 tiers, §2 gates, §3 delivery loop, §4 brief, §7 specialists, §8–§9 reports)._

Read-only in both modes.
- No flag → **diff**: code-reviewer ∥ security ∥ review specialists / dba on a diff; G3 verdict only. Scope as given (range, paths, branch); none → working tree vs `HEAD`, empty → `HEAD~1..HEAD`.
- `--audit` (or "audit bảo mật") → **audit**: security ∥ specialists / dba over the given scope (default whole repo); no gate.

1. (lead) Open W-NNN, pipeline `review (<mode>)`, resolve the scope (`git diff --stat`).
2. (reviewers in parallel) Diff: review the scope. Audit: trust boundaries, vulnerability classes, dependency audit, secret scan, config/IaC; large repo → list covered and skipped.
3. (lead) Merge findings: same `file:line` and root issue → one finding, highest severity; sort blocking → should fix → suggestion.
4. (lead) Diff: verdict **pass** or **blocked**, suggest `feature --small` / `fix`. Audit: summary in `STATE.md` and follow-up work items grouped by effort; do not start them unless asked.
