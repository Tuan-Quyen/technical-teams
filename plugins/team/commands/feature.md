---
description: "Build a feature: ba → (designer) → architect → pm → developer → code-reviewer ∥ security → qa → writer"
argument-hint: "<feature description> [--small]"
disable-model-invocation: true
---

Build this feature with the technical team:

$ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§6 (slug, STATE.md, TASKS.md, briefs, handoffs, closing) — Read it if you are not already the lead. Empty request → ask what to build, then stop.

`--small` (fits existing patterns: no new screen, contract or migration): skip steps 1–4; write 2–5 expected-behaviour bullets into STATE.md and the developer's brief (no tickets).

0. **Task list** — before the first spawn, put the steps below on the session's task list, one item per step (`update_plan` in the desktop app; `TaskCreate`/`TaskUpdate` in the CLI, loaded via ToolSearch if deferred; else `TodoWrite`), and keep it current (lead §3 *Task list*).
1. **Requirements** — `technical-team:team-ba` writes `.team/requirements/<slug>.md`. Questions → show them to the user, wait, pass the answers back.
2. **Frontend design** — only with user-facing UI: `technical-team:team-designer` writes `.team/frontend-design/<slug>.md` (and `DESIGN.md` if missing).
3. **System design** — `technical-team:team-architect` writes `.team/system-design/<slug>.md`. Schema or data change → `technical-team:team-dba` fills its "Data and migrations" section. Show the user a short summary and wait for OK.
4. **Tickets** — `technical-team:team-pm` writes the item's tickets in `.team/TASKS.md`. **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below. Workflow run: write the pm brief yourself (run-kit §3), set the STATE row, Read `${CLAUDE_PLUGIN_ROOT}/workflows/plan-tickets.js` and call Workflow with `script` = the file text unchanged and `args` = `{slug, pmBrief, maxRounds, context, root}`. pm still writes `.team/TASKS.md`; the script checks ids, roles, files, ACs, dependencies, group order and file overlap inside a group in code, and sends violations back to pm (up to `maxRounds` pm runs, default 2). In the pm brief ask for a `group` number per ticket (no `milestone`), and keep done tickets that others depend on listed, not collapsed, until the item closes. It returns `{status, rounds, tickets, groups, issues, handoff, needsUser}`: `done` → `groups` (add one brief per ticket) is step 5–8's `args.groups` for build-loop; `stuck` → show the `tickets` and `issues` to the user (`groups` is empty) and decide with them; `stopped` → route `needsUser` per run-kit §5.
**Build loop (steps 5–8)** — **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below. Workflow run: run them as one workflow; the user gates of steps 1–4 stay inline above. Write every agent's run-kit §3 brief yourself, then:
- Task list: one item per workflow phase (`Build`, `Review`, `Test`, `Docs`) in place of the items for steps 5–8. STATE row: step `5–8 (workflow)`, status `running`; tell the user it runs in the background and the result arrives as a task notification.
- Read `${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js` and call Workflow with `script` = the file text unchanged and `args` = `{slug, groups, reviewBriefs, qaBrief, writerBrief, maxRounds, startAt, fromGroup, root, acceptDisputed, context}`; Read the file again for every call (a `scriptPath` outside the project is rejected).
  - `groups`: the tickets of `TASKS.md` in dependency order as `[[{ticket, role, brief, files}]]`; tickets with disjoint files share a group and run in parallel. `role` is `developer`, or `dba` for migration tickets. `--small`: one group, one item.
  - `reviewBriefs`: `{"code-reviewer": …, "security": …(only if step 6 says so), "dba": …(only with migrations)}`. `qaBrief`: step 7. `writerBrief`: only if step 8 applies. `maxRounds` defaults to 3.
  - `root` (optional): the repo's absolute path, so findings with absolute paths still match a ticket's `files`.
- The workflow runs the group check (build, lint, tests once after a parallel group) itself, so skip the lead's re-run for it. It returns `{status, rounds, review, qa, notes, handoffs, needsUser}`. Update STATE and the task list, then:
  - `done` → step 9. Report `review.disputed` findings for their owners to decide.
  - `stuck` (findings still failing after `maxRounds`) → ask the user (lead §5).
  - `stopped` (`stoppedAt` names the stage; `needsUser` lists blocked, needs-input or dead agents, or `disputed` when every blocking finding of a failing reviewer was refuted: show those findings and the `remaining` undisputed ones, which are not auto-fixed; the user decides. If the user accepts the dispute, re-run with `acceptDisputed: [those finding IDs]` and `startAt: "qa"`, or `"review"` if other findings remain) → route per run-kit §5, ask the user if needed, then call Workflow again with the **full** `groups` (fix routing needs them) and the answer verbatim in `context`, plus where to resume from `stoppedAt`:
    - `Build`, round 0 → `startAt: "build"`, `fromGroup` = the index (from 0) of the group holding the stopped ticket named in `needsUser`; that group re-runs whole, earlier groups are not rebuilt.
    - `Build`, round ≥ 1 (a fix stopped) or `Review` → `startAt: "review"`.
    - `fix` (`needsUser` has `unowned` findings, whose file matches no ticket's `files`, or `unsafe-path` findings: absolute, `..`, `.git/` or `.claude/` paths) → no fixer was spawned and nothing was fixed. Show the findings and ask the user who owns them; never widen a ticket's `files` or add a ticket without their answer. Then re-run with `startAt: "review"` and the updated `groups`.
    - `Test` → `startAt: "qa"`. `Docs` → `startAt: "qa"` with no `qaBrief` (the writer runs again).
    A re-run restarts the round count.

5. **Build** — `technical-team:team-developer` per ticket in dependency order; tickets with disjoint files may run in parallel. Migration tickets → `technical-team:team-dba`.
6. **Review** — in parallel: `technical-team:team-code-reviewer` → `.team/reports/<slug>/review.md`, and `technical-team:team-security` → `.team/reports/<slug>/security.md` if the change touches auth, user input, data access, secrets, payments or personal data. FAIL → step 5 with the finding IDs.
7. **Test** — `technical-team:team-qa` → `.team/reports/<slug>/qa.md`. FAIL → step 5 (or `technical-team:team-debugger` if the cause is unclear), then review again.
8. **Docs** — `technical-team:team-writer` if usage, API or operations changed.
9. **Close** — lead §6.

Do not commit or push unless the user asks.
