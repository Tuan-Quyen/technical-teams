---
description: "Bugs (TB): debugger → developer → code-reviewer → QA regression test → security if triggered; --hotfix for urgent/production (minimal fix, security always, short docs); --diagnose for root cause only, no code"
argument-hint: "<bug or symptom> [--hotfix | --diagnose]"
disable-model-invocation: true
---
# /technical-team:fix — fix (TB · hotfix · diagnose)

## Running this command

Request: $ARGUMENTS

1. Empty request → ask in one short question for the bug or failing behaviour, then stop. Never guess.
2. If this session is the tech lead (`--agent technical-team:team-lead`), run the Pipeline below yourself. Otherwise call the Agent tool with `subagent_type: technical-team:team-lead` and this prompt:
```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/fix.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied in this conversation, or "none">
Read .team/STATE.md first.
```
   The team cannot see this conversation; "User-provided context" is the only way context reaches it.
3. Show the lead's report as written; do not do the team's work yourself. On `Chờ duyệt …`, stop and wait; never approve or choose for the user.
4. When the user answers, resume the same lead (SendMessage) or start a new Agent call: `Continue W-NNN (fix). User's answer (verbatim): <answer>. Read .team/STATE.md first.`

## Pipeline

_Run by the tech lead with the Lead manual rules (§1 tiers, §2 gates, §3 delivery loop, §4 brief, §7 specialists, §8–§9 reports)._

### Mode

- No flag → **fix** (TB): G1 only for a high-risk direction, then G2–G4; security if triggered.
- `--hotfix` → **hotfix**: minimal fix, security always, CHANGELOG + short note only. Faster through fewer people and shorter docs, never by skipping tests or review.
- `--diagnose` → **diagnose**: root cause only, no code.

Record the mode in `STATE.md`. A diagnosed item continues at step 2 when the user asks.

### Steps

0. (lead) Open W-NNN, pipeline `fix (<mode>)`, with the symptom as reported.
1. (debugger, + dba/specialist if the cause is in their domain) Reproduce, find the root cause with evidence, fix direction, risk and a regression test idea; the lead records it in `STATE.md`. Hotfix: the smallest safe fix plus a fallback (revert, flag, config). Not reproduced → report what was tried and stop. Diagnose mode ends here with a report.
2. (lead) **G1** only if high risk (shared code, data, security, behaviour users rely on) or several options; otherwise note "G1 skipped: <why>".
3. (developer, + dba for data fixes) Fix from the diagnosis, no re-diagnosis. Hotfix: minimal change only. Fix does not hold → debugger with the new evidence.
4. (code-reviewer + specialists, security in parallel when required) Check the fix addresses the root cause. Hotfix: anything beyond the minimal fix is blocking. Blocking → 3.
5. (qa) Short test plan and defect record in `TASKS.md#W-NNN` → `### QA`; regression test on the faulty path, related suite, retest; reproduce and re-check in the **live preview** when a user can see the bug; QA fan-out when ≥ 2 independent platforms. FAIL → 3. PASS = **G2**.
6. (security) Delta review since step 4. Blocking → 3.
7. (writer) **G3** on the final code. Docs if documented behaviour changed or a CHANGELOG is kept. Hotfix: CHANGELOG only, defer the rest. → **G4**; the report gives the root cause in one sentence and the commands the user runs.

Loop rules: Lead manual §3. Hotfix never lets a failing test or blocking finding through; a stalled loop pauses for the user sooner with revert/flag options.
