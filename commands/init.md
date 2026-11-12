---
description: "Create .team/STATE.md and .claude/technical-team.json in this project (other .team files are created on demand; --all creates everything up front), without overwriting anything"
argument-hint: "[--all]"
disable-model-invocation: true
allowed-tools: Bash(node *)
---
# /technical-team:init — create the shared workspace

Arguments: $ARGUMENTS

1. From the project root run `node "${CLAUDE_PLUGIN_ROOT}/scripts/team-init.mjs" --config` (add `--all` only if the user asked for every file up front).
2. Show which files were created and which were kept (the script never overwrites).
3. Remind the user, in their language:
   - Commit `.team/` so the whole team shares it.
   - `.claude/technical-team.json` is theirs to edit: `commands` (allowlists), `paths` (extra ownership, `paths.data`), `db` (local databases for dba), `skills` (per-role skills).
   - The other `.team/` files appear only when a pipeline first needs them; `.claude/agents/` appears at the first project hire (restart the session once after it).
