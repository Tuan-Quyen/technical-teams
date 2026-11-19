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
   - `technical-team:team-code-reviewer` → `.team/reports/<slug>/review.md`
   - `technical-team:team-security` → `.team/reports/<slug>/security.md`
   Add `technical-team:team-dba` if the diff has migrations.
3. Report one verdict (PASS only if both pass), the de-duplicated findings by severity with `file:line`, and a fix order. Offer `/technical-team:fix` for blocking findings.
4. **Close** — remove the item's STATE row and move `reports/<slug>/` to `.team/archive/<slug>/` (lead §6 steps 2 and 4).
