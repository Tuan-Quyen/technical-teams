---
description: "Build a feature by tier: T0 developer → code-reviewer · T1 ba → developer → code-reviewer (∥ security) → qa · T2 ba → (designer) → architect → pm → qa pre-check → developer → code-reviewer ∥ security → qa → writer"
argument-hint: "<feature description or issue ID (I3)> [--small | --tier T0|T1|T2]"
disable-model-invocation: true
---

Build this feature with the technical team:

$ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§6 — Read it if you are not already the lead. Empty request → ask what to build, then stop. An issue ID (`I3`) → its row in `.team/ISSUES.md` is the request; set its `status` to `in-progress` and `item` to this item's slug.

**Tier** (write it in the item; the user forces one with `--tier`):
- **T2** — new screen flow, new contract or module, auth or permissions, payment processing (charging, refunds, payouts), schema migrations, or deleting or rewriting stored data. Calculation logic that tests cover (prices, totals, tax) is not T2.
- **T1** — everything else: fits the existing architecture.
- **T0** — `--small` is the user's flag only: it applies only when `$ARGUMENTS` contains `--small` (or `--tier T0`); never pick it yourself. A request that looks small (no new screen, contract or migration): you may suggest `--small` in one line at step 0 and wait for the user's yes.
- Raise a tier at any step when the work turns out bigger; lowering one needs the reason in the item's `notes`.

| Step | T0 | T1 | T2 |
|---|---|---|---|
| 1. Requirements — `technical-team:team-ba` → `.team/requirements/<slug>.md`; questions → the user, answers back verbatim | 2–5 expected-behaviour bullets in the item's `notes` instead | ✓ — at most 5 ACs and 200 words, no PRODUCT.md edit | ✓ |
| 2. Design — `technical-team:team-designer` → `.team/frontend-design/<slug>.md` | — | only a changed screen | user-facing UI |
| 3. System design — `technical-team:team-architect` → `.team/system-design/<slug>.md` (+ `technical-team:team-dba` for schema); show a summary, wait for OK | — | — | ✓ |
| 4. Tickets — `technical-team:team-pm` → `.team/TASKS.md` | no pm: you write one ticket into `groups` | no pm, no TASKS.md: you write one ticket into `groups` from the ACs and the files they touch | ✓ |
| 5. QA pre-check — `technical-team:team-qa` (qa-lines pre-check line) | — | — | ✓ |
| 6. Build — `technical-team:team-developer` per ticket (migrations → `technical-team:team-dba`) | ✓ | ✓ | ✓ |
| 7. Review — `technical-team:team-code-reviewer`; ∥ `technical-team:team-security` when the diff touches auth, user input, secrets, payments or personal data; ∥ `technical-team:team-dba` when it touches schema or queries | code-reviewer | ✓ | ✓ |
| 8. Test — `technical-team:team-qa` (qa-lines execution line, then retest) | — (you re-run the test suite yourself) | ✓ | ✓ |
| 9. Docs — `technical-team:team-writer` if usage, API or operations changed | — | if needed | if needed |

With `--small`: exactly one ticket (one developer, `groups: [[one item]]`), no parallel groups, no ticket split by the lead. Blocking findings from step 7 or 8 → step 6 as one batch, then review and retest (run-kit `qa-loop.md`); unclear cause → `technical-team:team-debugger`.

**Tickets (T2, step 4)** — **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below. Workflow run: call Workflow with `name: 'technical-team:team-plan-tickets'` (`${CLAUDE_PLUGIN_ROOT}/workflows/plan-tickets.js`) and `args` = `{slug, key, pmBrief, maxRounds, context, root}` (tickets are `<KEY>-T<n>`; ask pm for a `group` number per ticket). It checks ids, roles, files, ACs, dependencies and overlap in code and sends violations back to pm (up to `maxRounds`, default 2). `done` → `groups` (add one brief per ticket) is the build loop's `groups`. Route the rest per run-kit §6.

**Build loop (steps 5–9)** — same **Workflow opt-in** as above: call Workflow with `name: 'technical-team:team-build-loop'` (`${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js`) and `args` = `{item, groups, reviewBriefs, qaPlanBrief, qaBrief, writerBrief, startAt, fromGroup, root, context, date}`, the briefs only for the steps the tier runs:
- `item`: `.team/items/<slug>.json` as it is. `groups`: `[[{ticket, role, brief, files}]]` in dependency order; disjoint files share a group; `role` is `developer` or `dba`.
- `reviewBriefs`: `{"code-reviewer": …, "security": …, "dba": …}` as step 7 says. `qaPlanBrief` (T2), `qaBrief` (T1, T2), `writerBrief` (step 9). `root`: the repo's absolute path. `date`: today (`YYYY-MM-DD`), stamped on the loop's `decisions`. The script appends the qa-loop lines and runs the group check.
- It returns `{status, item, round, cap, handoffs, needsUser}`: write `item` back first, then route per run-kit §6.

10. **Close** — lead §6. Do not commit or push unless the user asks.
