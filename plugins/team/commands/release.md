---
description: "Release readiness: qa ∥ security ∥ devops (∥ dba) → changelog → GO / NO-GO; nothing is deployed"
argument-hint: "[version]"
disable-model-invocation: true
---

Prepare a release with the technical team: $ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§6 — Read it if you are not already the lead. Range = last tag (`git describe --tags --abbrev=0`) → `HEAD`; no tag yet → all history.

**Version** — resolve it before step 0; the slug is `release-<version>`. Given → use it. No tag → `0.1.0`. Else propose the next semver from the range's commits (any breaking → major, else any `feat` → minor, else patch) and use it.

0. **Task list** — before the first spawn, put the steps below on the session's task list, one item per step (`update_plan` in the desktop app; `TaskCreate`/`TaskUpdate` in the CLI, loaded via ToolSearch if deferred; else `TodoWrite`), and keep it current (lead §3 *Task list*).
1. In parallel:
   - `technical-team:team-qa` — full suite and a smoke check of the main flows.
   - `technical-team:team-security` — the range plus a dependency audit.
   - `technical-team:team-devops` — build, config names, migration order, deploy and rollback readiness (local checks only), in its reply.
   - `technical-team:team-dba` — only if migrations were added in the range.
   **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below. (Here the inline steps are the list above.) Workflow run (load `technical-team:run-kit` if not loaded) (step `1 (workflow)`; briefs for the four above plus `writer` for step 2): call Workflow with `name: 'technical-team:team-release'` (`${CLAUDE_PLUGIN_ROOT}/workflows/release.js`) and `args` = `{slug, briefs: {"qa": "…", "security": "…", "devops": "…", "dba": "<only with migrations>", "writer": "…"}, items, issues, context}` — `items` (required): every `.team/items/*.json` object, i.e. all open items (`[]` when none); `issues` (required): the open `.team/ISSUES.md` rows with severity blocker or critical, or priority P1, as `{id, title, severity, priority, accepted}` (`accepted: true` only when the user accepted it, their words in `decisions`; `[]` when none). It runs the gates in parallel, then the writer with their verdicts, and returns `{gates, notes, needsUser, goNoGo, items, issues}`: any item not `clear` (blocked, open blockers) or issue not accepted makes it NO-GO whatever the gates say. Route the result per run-kit §6, then go to step 3 (skip step 2).
2. `technical-team:team-writer` drafts the CHANGELOG / release notes for the range, breaking changes first, and a **Known issues** list from the open rows of `.team/ISSUES.md` (bugs only, ID and title; none → no section); the workflow's writer brief carries the same line. Version is the lead's: confirm it matches the range's changes or flag a mismatch; do not pick another.
3. Report **GO** or **NO-GO** with reasons (inline: any open item with a blocking finding not verified, deferred or rejected is NO-GO), blocking items, test results and the exact commands the user runs (tag, push, deploy, rollback). Inline too, an open `.team/ISSUES.md` row with severity blocker or critical, or priority P1, is NO-GO unless the user accepts it (their words in the item's `decisions`). Close per lead §6; a gate's blocking finding left open becomes a `new` row too.

Do not tag, push, publish or deploy unless the user asks.
