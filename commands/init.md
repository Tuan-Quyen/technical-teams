---
description: "Create the .team/ workspace (and .claude/technical-team.json) in this project from the plugin templates, without overwriting anything"
disable-model-invocation: true
allowed-tools: Bash(node *)
---
# /technical-team:init — create the shared workspace

| Step | Do |
|---|---|
| 1 | Run with the Bash tool from the project root: `node "${CLAUDE_PLUGIN_ROOT}/scripts/team-init.mjs"` |
| 2 | Show which files were **created** and which were **kept** (the script never overwrites, so each file keeps its single owner and content) |
| 3 | Remind the user, in their language: |

| Reminder | |
|---|---|
| `.team/` | commit it so the whole team shares it |
| `.claude/technical-team.json` | theirs to edit: `commands` (allowlists for developer/qa/devops), `paths` (extra ownership globs, `paths.dba`), `db` (local hosts/databases for dba), `skills` (per-role skills) |
| `.claude/agents/` | created so specialists hired later load without a restart |
