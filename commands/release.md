---
description: "Release readiness: devops ∥ security ∥ QA → CHANGELOG → GO/NO-GO; nothing is deployed"
argument-hint: "[version]"
disable-model-invocation: true
---
# /technical-team:release — release (GO/NO-GO)

## Running this command

Request: $ARGUMENTS

1. No argument needed (optional version).
2. If this session is the tech lead (`--agent technical-team:team-lead`), run the Pipeline below yourself. Otherwise call the Agent tool with `subagent_type: technical-team:team-lead` and this prompt:
```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/release.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied in this conversation, or "none">
Read .team/STATE.md first.
```
   The team cannot see this conversation; "User-provided context" is the only way context reaches it.
3. Show the lead's report as written; do not do the team's work yourself. On `Chờ duyệt …`, stop and wait; never approve or choose for the user.
4. When the user answers, resume the same lead (SendMessage) or start a new Agent call: `Continue W-NNN (release). User's answer (verbatim): <answer>. Read .team/STATE.md first.`

## Pipeline

_Run by the tech lead with the Lead manual rules (§1 tiers, §2 gates, §3 delivery loop, §4 brief, §7 specialists, §8–§9 reports)._

Gates G2, G3, G4. Never deploys or tags.

0. (lead) Open W-NNN, pipeline `release`. Range = last release tag → `HEAD` (devops determines it). No tag yet → all history + uncommitted files, default version `0.1.0`.
1. (qa ∥ security ∥ devops ∥ specialists ∥ lead) In parallel:
   - (qa) Full regression, open-defect review, test summary in `### QA`, live-preview smoke of the main flows on the release build → **G2**.
   - (security) Changes since the last tag + dependency audit → **G3**.
   - (devops) Range, artifacts, migration steps, config names, deploy + rollback in `OPS_HANDOFF.md`.
   - (specialists, dba) Release-relevant checks, e.g. pending migrations.
   - (lead) Open blocking findings and deferred items in `STATE.md`.
2. (writer) CHANGELOG / release notes from the work items and commits, verified against the code; upgrade notes for breaking changes. No version given → propose one by semver.
3. (lead) **GO** only if G2 passed, no blocking findings, deploy + rollback ready, docs updated; otherwise **NO-GO** with reasons and the shortest path to GO. Report the exact commands the user runs (commit, tag, push, deploy, rollback).
