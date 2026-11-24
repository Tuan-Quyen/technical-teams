---
description: "Build a feature by tier: T0 developer → code-reviewer · T1 ba → developer → code-reviewer (∥ security) → qa · T2 ba → (designer) → architect → pm → qa pre-check → developer → code-reviewer ∥ security → qa → writer"
argument-hint: "<feature description or issue ID (I3)> [--small | --tier T0|T1|T2]"
disable-model-invocation: true
---

# /technical-team:feature

Build this feature with the technical team:

$ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*.

## When to use

- A new capability, or a change to how the product behaves. A bug → `fix`.
- Empty request → ask what to build, then stop.
- **Tier** (run-kit §2). **T0** — `--small` is the user's flag only: it applies only when `$ARGUMENTS` contains `--small` (or `--tier T0`); never pick it yourself. A request that looks small (no new screen, contract or migration): you may suggest `--small` in one line before step 1 and wait for the user's yes.

## Steps

| # | Step | Agent → writes | Gate / verify |
|---|---|---|---|
| 1 | Requirements | `technical-team:team-ba` → `.team/requirements/<slug>.md` | questions → the user, answers back verbatim |
| 2 | Design | `technical-team:team-designer` → `.team/frontend-design/<slug>.md` | every AC has a screen |
| 3 | System design | `technical-team:team-architect` → `.team/system-design/<slug>.md` (+ `technical-team:team-dba` for schema) | show a summary, wait for the user's OK |
| 4 | Tickets | `technical-team:team-pm` → `.team/TASKS.md` | the plan-tickets code check |
| 5 | QA pre-check | `test` (as a step: pre-check) | a spec issue stops the build |
| 6 | Build | `technical-team:team-developer` per ticket (migrations → `technical-team:team-dba`) | build, lint and test evidence in the Handoff; board sync |
| 7 | Review | `review` (as a step: gate): code-reviewer; ∥ security when the diff touches auth, user input, secrets, payments or personal data; ∥ dba when it touches schema or queries | PASS, or blocking findings → `fix` (as a step: findings); board sync |
| 8 | Test | `test` (as a step: gate) | PASS, or blocking findings → `fix` (as a step: findings), then 7 and 8 again; board sync |
| 9 | Docs | `technical-team:team-writer` if usage, API or operations changed | – |
| 10 | Close | orchestrator §6 | the owner's closing call |

### By tier

| Step | T0 | T1 | T2 |
|---|---|---|---|
| 1 | 2–5 expected-behaviour bullets in the item's `notes` instead | ✓ — at most 5 ACs and 200 words, no PRODUCT.md edit | ✓ |
| 2 | — | only a changed screen | user-facing UI |
| 3 | — | — | ✓ |
| 4 | no pm: you write one ticket into `groups` | no pm, no TASKS.md: you write one ticket into `groups` from the ACs and the files they touch | ✓ |
| 5 | — | — | ✓ |
| 6 | ✓ | ✓ | ✓ |
| 7 | code-reviewer | ✓ | ✓ |
| 8 | — (you re-run the test suite yourself) | ✓ | ✓ |
| 9 | — | if needed | if needed |

- With `--small`: exactly one ticket (one developer, `groups: [[one item]]`), no parallel groups, no ticket split by the orchestrator.
- Blocking findings from step 7 or 8 → `fix` (as a step: findings) as one batch, then review and retest (run-kit `qa-loop.md`); unclear cause → `fix` (as a step: symptom). Board sync only at T2 (tickets on the board).

## Workflow

**Tickets (T2, step 4)** — **Workflow** (run-kit §2 opt-in): call Workflow with `name: 'technical-team:team-plan-tickets'` (`${CLAUDE_PLUGIN_ROOT}/workflows/plan-tickets.js`) and `args` = `{slug, key, pmBrief, maxRounds, context, root}` (tickets are `<KEY>-T<n>`; ask pm for a `group` number per ticket). It checks ids, roles, files, ACs, dependencies and overlap in code and sends violations back to pm (up to `maxRounds`, default 2). `done` → `groups` (add one brief per ticket) is the build loop's `groups`. Route the rest per run-kit §6.

**Build loop (steps 5–9)** — **Workflow** (run-kit §2 opt-in): call Workflow with `name: 'technical-team:team-build-loop'` (`${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js`) and `args` = `{item, groups, reviewBriefs, qaPlanBrief, qaBrief, writerBrief, boardBrief, startAt, fromGroup, root, context, date}`, the briefs only for the steps the tier runs (`boardBrief`: T2, run-kit `qa-loop.md` § Board sync):
- `item`: `.team/items/<slug>.json` as it is. `groups`: `[[{ticket, role, brief, files}]]` in dependency order; disjoint files share a group; `role` is `developer` or `dba`.
- `reviewBriefs`: `{"code-reviewer": …, "security": …, "dba": …}` as step 7 says. `qaPlanBrief` (T2), `qaBrief` (T1, T2), `writerBrief` (step 9). `root`: the repo's absolute path. `date`: today (`YYYY-MM-DD`), stamped on the loop's `decisions`. The script appends the qa-loop lines and runs the group check.
- It returns `{status, item, round, cap, handoffs, needsUser}`: write `item` back first, then route per run-kit §6.

## Done when

- Review and qa (the gates the tier runs) PASS with no open blocking finding, and the item is closed per orchestrator §6.
