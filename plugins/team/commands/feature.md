---
description: "Build a feature: ba → (designer) → architect → pm → developer → code-reviewer ∥ security → qa → writer"
argument-hint: "<feature description> [--small]"
disable-model-invocation: true
---

Build this feature with the technical team:

$ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§6 (slug, STATE.md, TASKS.md, briefs, handoffs, closing) — Read it if you are not already the lead. Empty request → ask what to build, then stop.

`--small` is the user's flag only: it applies only when `$ARGUMENTS` contains `--small`; without it, run the full pipeline, never pick it yourself. If the request looks small (fits existing patterns: no new screen, contract or migration), you may suggest `--small` in one line at step 0 and wait for the user's yes. With `--small`: skip steps 1–4; write 2–5 expected-behaviour bullets into STATE.md and the developer's brief; exactly one ticket (one developer, `groups: [[one item]]`), no parallel groups, no ticket split by the lead.

0. **Task list** — before the first spawn, put the steps below on the session's task list, one item per step (`update_plan` in the desktop app; `TaskCreate`/`TaskUpdate` in the CLI, loaded via ToolSearch if deferred; else `TodoWrite`), and keep it current (lead §3 *Task list*).
1. **Requirements** — `technical-team:team-ba` writes `.team/requirements/<slug>.md`. Questions → show them to the user, wait, pass the answers back.
2. **Frontend design** — only with user-facing UI: `technical-team:team-designer` writes `.team/frontend-design/<slug>.md` (and `DESIGN.md` if missing).
3. **System design** — `technical-team:team-architect` writes `.team/system-design/<slug>.md`. Schema or data change → `technical-team:team-dba` fills its "Data and migrations" section. Show the user a short summary and wait for OK.
4. **Tickets** — `technical-team:team-pm` writes the item's tickets in `.team/TASKS.md`. **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below. Workflow run (load `technical-team:run-kit` if not loaded): call Workflow with `name: 'technical-team:team-plan-tickets'` (`${CLAUDE_PLUGIN_ROOT}/workflows/plan-tickets.js`) and `args` = `{slug, pmBrief, maxRounds, context, root}`. pm still writes `.team/TASKS.md`; the script checks ids, roles, files, ACs, dependencies, group order and file overlap inside a group in code, and sends violations back to pm (up to `maxRounds` pm runs, default 2). In the pm brief ask for a `group` number per ticket (no `milestone`), and keep done tickets that others depend on listed, not collapsed, until the item closes. It returns `{status, rounds, tickets, groups, issues, handoff, needsUser}`: `done` → `groups` (add one brief per ticket) is step 5–8's `args.groups` for build-loop. Route the rest per run-kit §6 (`stuck` has an empty `groups`).
**Build loop (steps 5–8)** — **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below. Workflow run (load `technical-team:run-kit` if not loaded): run them as one workflow (STATE row step `5–8 (workflow)`; the user gates of steps 1–4 stay inline above) with phases `Build`, `Review`, `Test`, `Docs` in place of the items for steps 5–8: call Workflow with `name: 'technical-team:team-build-loop'` (`${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js`) and `args` = `{slug, groups, reviewBriefs, qaBrief, writerBrief, maxRounds, startAt, fromGroup, root, acceptDisputed, context}`.
- `groups`: the tickets of `TASKS.md` in dependency order as `[[{ticket, role, brief, files}]]`; tickets with disjoint files share a group and run in parallel. `role` is `developer`, or `dba` for migration tickets. `--small`: exactly one group with one item.
- `reviewBriefs`: `{"code-reviewer": …, "security": …(only if step 6 says so), "dba": …(only with migrations)}`. `qaBrief`: step 7. `writerBrief`: only if step 8 applies. `maxRounds` defaults to 3.
- `root` (optional): the repo's absolute path, so findings with absolute paths still match a ticket's `files`.
- It returns `{status, rounds, review, qa, notes, handoffs, needsUser}` and runs the group check itself, so skip the lead's re-run for it. Route the result per run-kit §6; `done` → step 9.

5. **Build** — `technical-team:team-developer` per ticket in dependency order; tickets with disjoint files may run in parallel. Migration tickets → `technical-team:team-dba`.
6. **Review** — in parallel: `technical-team:team-code-reviewer` → `.team/reports/<slug>/review.md`, and `technical-team:team-security` → `.team/reports/<slug>/security.md` if the change touches auth, user input, data access, secrets, payments or personal data. FAIL → step 5 with the finding IDs.
7. **Test** — `technical-team:team-qa` → `.team/reports/<slug>/qa.md`. FAIL → step 5 (or `technical-team:team-debugger` if the cause is unclear), then review again.
8. **Docs** — `technical-team:team-writer` if usage, API or operations changed.
9. **Close** — lead §6.

Do not commit or push unless the user asks.
