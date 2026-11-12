---
description: "Create .team/STATE.md and .claude/technical-team.json in this project (other .team files are created on demand; --all creates everything up front), without overwriting anything"
argument-hint: "[--all]"
disable-model-invocation: true
allowed-tools: Bash(node *)
---
# /technical-team:init — create the shared workspace

**Arguments:** $ARGUMENTS

| Step | Do |
|---|---|
| 1 | Run with the Bash tool from the project root: `node "${CLAUDE_PLUGIN_ROOT}/scripts/team-init.mjs" --config` (add `--all` only if the user asked for every file up front) |
| 2 | Show which files were **created** and which were **kept** (the script never overwrites, so each file keeps its single owner and content) |
| 3 | Remind the user, in their language: |

| Reminder | |
|---|---|
| `.team/` | commit it so the whole team shares it |
| `.claude/technical-team.json` | theirs to edit: `skills` — extra skills per agent (`"team-developer": ["<skill>"]`, `"*"` for everyone). Project skills by name, plugin skills as `<plugin>:<skill>`. Empty lists are fine |
| On demand | the other `.team/` files (SPEC, PRODUCT, DESIGN, PLAN, TASKS, OPS_HANDOFF, ROSTER) and `archive/` appear only when a pipeline first needs them; `.claude/agents/` appears at the first project hire (restart the session once after it) |
