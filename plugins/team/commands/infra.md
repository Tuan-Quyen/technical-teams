---
description: "Infrastructure work: devops proposal → implement → code-reviewer ∥ security → runbook"
argument-hint: "<infra request>"
disable-model-invocation: true
---

Infrastructure work with the technical team:

$ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§6 — Read it if you are not already the lead. Empty request → ask for the request, then stop.

0. **Task list** — before the first spawn, put the steps below on the session's task list, one item per step (`update_plan` in the desktop app; `TaskCreate`/`TaskUpdate` in the CLI, loaded via ToolSearch if deferred; else `TodoWrite`), and keep it current (lead §3 *Task list*).
1. **Propose** — `technical-team:team-devops` in proposal mode: files, verification, remote steps, rollback. Show it to the user and wait for OK.
**Build loop (steps 2–3)** — the proposal and its OK (step 1) stay inline. **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below. Workflow run: run steps 2–3 as one workflow, as `${CLAUDE_PLUGIN_ROOT}/commands/feature.md` describes for its build loop (task list, STATE row `2–3 (workflow)`, result handling, re-run): call Workflow with `name: 'technical-team:team-build-loop'` and `args` = `{slug, groups: [[{ticket: "infra", role: "devops", brief: <step 2 brief>, files: <files from the proposal>}]], reviewBriefs: {"code-reviewer": …, "security": …}}` (if the name is not found, Read `${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js` and pass its text as `script` with the same args) with no `qaBrief` and no `writerBrief`. The runbook (step 4) stays inline after `done`.

2. **Build** — `technical-team:team-devops` implements and verifies locally.
3. **Review** — in parallel: `technical-team:team-code-reviewer` → `.team/reports/<slug>/review.md`, `technical-team:team-security` → `.team/reports/<slug>/security.md`. FAIL → step 2.
4. **Runbook** — `technical-team:team-writer` writes `.team/docs/runbooks/<slug>.md` (build, deploy, rollback) from the real files; `technical-team:team-architect` updates "Operations" in `ARCHITECTURE.md` if it changed.
5. **Close** — lead §6, with the exact remote commands for the user in order, plus rollback.

Do not apply, deploy or push unless the user asks.
