---
description: "Create .team/STATE.md and .claude/technical-team.json in this project (other .team files are created on demand; --all creates every singleton up front), without overwriting anything"
argument-hint: "[--all]"
disable-model-invocation: true
allowed-tools: Bash(node *)
---
# /technical-team:init — create the shared workspace

Arguments: $ARGUMENTS

1. From the project root run `node "${CLAUDE_PLUGIN_ROOT}/scripts/team-init.mjs" --config` (add `--all` only if the user asked for every singleton file up front; per-item files are never created ahead of their work item).
2. Show which files were created and which were kept (the script never overwrites).
3. Remind the user, in their language:
   - Commit `.team/` so the whole team shares it.
   - `.claude/technical-team.json` is theirs to edit: `skills` (per-role skills the lead may name in a brief) and `externalAgents` (non-team agents the lead may call, read-only).
   - The other `.team/` files and folders (`requirements/`, `system-design/`, `frontend-design/`, `qa/`, `reports/`, `adr/`, `archive/`) appear only when a pipeline first needs them; `.claude/agents/` appears at the first project hire (restart the session once after it).
