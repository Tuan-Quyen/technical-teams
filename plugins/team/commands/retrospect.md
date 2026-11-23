---
description: "Look back over the last 7–30 days of Claude Code sessions that used the team: team-retrospector audits the current plugin version from the local transcripts, `.team/` artifacts, git and the plugin definitions, compares it with the last retro, and proposes evidence-backed changes to agents, skills, commands, hooks and workflows; you pick what to apply"
argument-hint: "[days 7-30, default 14] [--project <name part>] [--exclude-project <name part>] [--since <date>] [--include-dev]"
disable-model-invocation: true
---

# /technical-team:retrospect

Retrospect: $ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*. No item, no edits to the plugin; one retrospector spawn.

## When to use

- "How has the team done / retro / what should the team change". Re-run after a release or every few weeks of use.
- Transcripts hold the user's own prompts and code: the report stays local — say so if the user asks to share it.

## Steps

| # | Step | Agent | Gate / verify |
|---|---|---|---|
| 1 | Retrospect | `technical-team:team-retrospector` with Bash, Read, Write `.team/retrospect/` and the brief lines below; it loads `technical-team:retrospect` | Handoff `done` with the window, version and session count; `.team/retrospect/<YYYY-MM-DD>/retrospect.md` (≤ 600 words), `changes.md` and `drafts/`, unless zero sessions on this version |
| 2 | Report | – | relay the version, the session count, the proposals by group (Agents, Skills, Commands) as `A1 · new | update | delete · <path> — problem → metric now → target` and the Δ since the last retro |

- **Brief lines** — `Window: <days from the request, default 14> <flags from the request>` · `Exclude session: ${CLAUDE_SESSION_ID}` · `Plugin root: ${CLAUDE_PLUGIN_ROOT}` · `Language: <the language the user writes in>`.
- **Pick** — ask which recommendations to apply. Applying one is a change to the plugin source, made by the user or in its own session; do not start it unasked.

## Done when

- The user has the top recommendations with their refs and the report path; nothing applied unasked.
