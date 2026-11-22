---
description: "Look back over the last 7–30 days of Claude Code sessions that used the team: a script mines the local transcripts, the lead turns the signals into evidence-backed changes to agents, skills, commands, hooks and workflows; you pick what to apply"
argument-hint: "[days 7-30, default 14] [--project <name part>] [--include-dev]"
disable-model-invocation: true
---

Retrospect: $ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` (Rules) — Read it if you are not already the lead. No item, no spawn, no edits to the plugin; the only file you write is the report.

1. **Collect** — run `node "${CLAUDE_PLUGIN_ROOT}/tools/retrospect.mjs" <the request's days and flags> --exclude-session ${CLAUDE_SESSION_ID} --out <your scratchpad or temp dir>/retrospect`. It reads `~/.claude/projects` only and writes `digest.md` (read it) and `digest.json` (open only to check a detail). Zero plugin sessions → say so with the window and stop.
2. **Analyze** — for each signal in the digest, open the component it names in `${CLAUDE_PLUGIN_ROOT}` (agent, command, skill or reference, `hooks/guard.mjs`, workflow) and decide: a real defect of the plugin, or noise (an older plugin version, the environment, one odd run). Open a ref's transcript line only when the snippet is not enough. Rules:
   - A recommendation needs ≥2 refs from ≥2 sessions, or 1 ref plus a metric. Less → **Hypotheses**.
   - Evidence from an older plugin version counts only if the current file still has the cause; say which line.
   - `unused` is a candidate, not a verdict: a pipeline the user never needed in the window is not dead. Remove or merge only with a second signal (overlap with another component, a roster gap it should have covered).
   - Prefer the smallest change: a brief line, a rule, a description, then a new skill reference; a new agent, command or hook only for a gap seen in ≥2 sessions. Count what it adds to the lead's context.
   - A remove or rename touches the public contract: say `tests/contract.json` deprecated + CHANGELOG.
3. **Report** — write `.team/retrospect/<YYYY-MM-DD>.md` from `${CLAUDE_PLUGIN_ROOT}/templates/core/RETROSPECT.md`, recommendations ranked by impact. Reply with the window and session count, then the top 5 as `R1 · component · action — problem (refs)`, and ask which to apply. Applying one is a change to the plugin source, made by the user or in its own session; do not start it unasked.

Re-run after a release or every few weeks of use. Transcripts hold your own prompts and code: the report stays local — say so if the user asks to share it.
