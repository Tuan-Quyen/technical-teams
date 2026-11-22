---
description: "Review: code-reviewer ∥ security on a diff, merged into one verdict; no code changes"
argument-hint: "[branch | path | commit range] — default: current changes"
disable-model-invocation: true
---

Review this target with the technical team: $ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§5 — Read it if you are not already the lead. Slug: `review-<branch or date>`.

0. **Task list** — before the first spawn, put the steps below on the session's task list, one item per step (`update_plan` in the desktop app; `TaskCreate`/`TaskUpdate` in the CLI, loaded via ToolSearch if deferred; else `TodoWrite`), and keep it current (lead §3 *Task list*).
1. Resolve the scope (`git status`, `git diff --stat`). No target → uncommitted changes plus the branch vs its base; nothing there → `HEAD~1..HEAD`.
2. In parallel, same scope in both briefs:
   - `technical-team:team-code-reviewer`
   - `technical-team:team-security`
   Add `technical-team:team-dba` if the diff has migrations.

   **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below. (Here the inline steps are the list above.) Workflow run (load `technical-team:run-kit` if not loaded) (step `2 (workflow)`): call Workflow with `name: 'technical-team:team-review'` (`${CLAUDE_PLUGIN_ROOT}/workflows/review.js`) and `args` = `{slug, briefs: {"code-reviewer": "<brief>", "security": "<brief>", "dba": "<brief, only with migrations>"}, items, context}` — `items` (required): the `.team/items/<slug>.json` objects of the open items the diff belongs to (`[]` when none). It returns `{verdict, findings, disputed, handoffs, needsUser, items}`: `items` gives each item's status (`clear`, `open-blockers`, `BLOCKED_PENDING_USER_DECISION`, `invalid`); the review verdict never moves an item: each blocking finding was re-checked by a skeptic of the same role, and refuted ones sit in `disputed`, not deleted. Route the result per run-kit §6, and report the `disputed` findings (marked disputed, with the skeptic's reason; the owners decide; review.js returns them at top level and has no `status`), then go to step 3.
3. Report one verdict (PASS only if both pass), the de-duplicated findings by severity with `file:line`, and a fix order. Findings on a diff that no open item owns → `new` rows in `.team/ISSUES.md` (create it from `${CLAUDE_PLUGIN_ROOT}/templates/core/ISSUES.md` if missing; source `review-<branch or date>`; disputed ones stay in the report only); an open item's findings stay with that item. Offer `/technical-team:fix I<n>` for blocking ones; 5 or more `new` rows → `${CLAUDE_PLUGIN_ROOT}/commands/triage.md` step 2.
4. **Close** — delete this command's own item JSON and move its `reports/<slug>/` (if any) to `.team/archive/<slug>/` (lead §6). A build-loop item in scope (it has `.team/items/<slug>.json`) is never changed, closed or reported PASS or ready here: a blocked item stays blocked; only its own pipeline closes it.
