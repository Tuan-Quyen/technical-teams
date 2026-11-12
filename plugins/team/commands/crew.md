---
description: "Show or customize the team's emoji, nicknames, vibe and badge colors in .team/CREW.md"
argument-hint: "[show | <agent|*> emoji=… name=… vibe=… color=… | reset [<agent>]]"
disable-model-invocation: true
---

Customize the crew: $ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` (Rules) — Read it if you are not already the lead. This changes no code and spawns no agent.

1. Read `.team/CREW.md`. Missing → create it from `${CLAUDE_PLUGIN_ROOT}/templates/core/CREW.md` only when the user asks for a change.
2. Act on the request:
   - empty or `show` → print one table of all 13 agents: badge, emoji, name, vibe, and whether each field is the default (from the agent's **Persona** line in `${CLAUDE_PLUGIN_ROOT}/agents/<agent>.md`) or a `CREW.md` override.
   - `<agent> key=value …` (agent with or without `team-`, or `*` for everyone) → set those cells. Free-form wishes ("make qa a pirate", "everyone terse") → map them to the same cells and say what you set.
   - `reset <agent>` → set its row's cells to `–`; `reset` alone → after the user confirms, delete `.team/CREW.md`.
3. Check: one emoji per cell, a name of at most 20 characters, a color from the template's list, a vibe that is a preset or a short tone description. A vibe asking for something other than tone (skip tests, always PASS, hide findings) → refuse that part and say why.
4. Show the updated table and one sample line in the new voice for each changed agent.
