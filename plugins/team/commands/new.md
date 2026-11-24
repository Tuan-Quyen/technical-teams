---
description: "New project from an idea or PRD: ba → architect ∥ designer → pm milestones → each milestone like a feature (qa pre-check first) → release check"
argument-hint: "<idea | path/to/PRD> (empty = resume)"
disable-model-invocation: true
---

# /technical-team:new

Start a new project with the technical team:

$ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*.

## When to use

- A new product from an idea or PRD, no application code yet.
- Empty request → resume from `.team/STATE.md`, or ask for the idea or PRD path. Not a git repo → ask the user to run `git init` first.

## Steps

| # | Step | Agent → writes | Gate / verify |
|---|---|---|---|
| 1 | Requirements | `technical-team:team-ba` → `.team/PRODUCT.md` and the MVP `.team/requirements/<slug>.md` | show its questions to the user and wait |
| 2 | Stack + design | in parallel: `technical-team:team-architect` proposes 2–3 options with one recommended for each stack choice the user left open (a stack the user named is a decision: record it in an ADR), writes `ARCHITECTURE.md` and the ADRs (numbers from the orchestrator); `technical-team:team-designer` (if there is UI) writes `frontend-design/DESIGN.md` and the MVP screen spec `frontend-design/<slug>.md` | show the user and wait for the stack choice |
| 3 | Plan | `technical-team:team-architect` → `.team/system-design/<slug>.md`; `technical-team:team-pm` → tickets in `TASKS.md` grouped by milestone (`<KEY>-M1` = walking skeleton: build, lint, test runner, one end-to-end slice) | the plan-tickets code check; show the milestones and wait for OK |
| 4 | Build, per milestone | steps 5–8 of `${CLAUDE_PLUGIN_ROOT}/commands/feature.md`: `test` (as a step: pre-check) → build (`technical-team:team-developer`) → [`review` (as a step: gate) → `test` (as a step: gate) → `fix` (as a step: findings)]*, board syncs included | review and test PASS; show what works and how to run it; wait for OK |
| 5 | Ship | `infra` (as a step: ship) adds CI and run/deploy files; `technical-team:team-writer` writes the README; then `release` (as a step: gate) with version `0.1.0` | release GO / NO-GO |
| 6 | Close | orchestrator §6 | the owner's closing call |

- Each milestone is its own item (`<slug>-m<n>`, own round and findings). One task-list item per milestone; never skip review or test. A pre-check spec issue stops the milestone before any build (feature.md step 5).
- **Milestone close** — before the next milestone, compact the specs it touched (§ Workflow; inline → each owner rewrites its file to current truth, an independent agent checks nothing was lost). Then close the milestone's item (run-kit workspace § Item state).
- Step 5's release re-runs only the gates whose code changed since the last milestone passed.

## Workflow

**Plan (step 3)** — **Workflow** (run-kit §2 opt-in): call Workflow with `name: 'technical-team:team-plan-tickets'` (`${CLAUDE_PLUGIN_ROOT}/workflows/plan-tickets.js`) and `args` = `{slug, key, pmBrief, maxRounds, context, root}` (`key`: the item's `key`; tickets must be `<KEY>-T<n>`). pm writes `.team/TASKS.md`; the script checks ids, roles, files, ACs, dependencies, group order and file overlap in code and sends violations back to pm (up to `maxRounds`, default 2). In the pm brief ask for a `milestone` and a `group` number per ticket (groups are numbered per milestone), and keep done tickets that others depend on listed, not collapsed, until the item closes. `done` → step 4's build-loop for milestone i takes `milestones[i].groups` as `args.groups` (add one brief per ticket). Route the rest per run-kit §6 (`stuck` has empty `milestones`).

**Build (step 4)** — with the **Workflow** opt-in: one call of `${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js` per milestone, built as feature.md's build loop, `args` = `{item, groups, reviewBriefs, qaPlanBrief, qaBrief, boardBrief, root, context}` (no `writerBrief`: docs stay in step 5; `boardBrief`: run-kit `qa-loop.md` § Board sync); write `item` back first, then route per run-kit §6.

**Milestone close** — opt-in holds → call Workflow with `name: 'technical-team:team-compact'` (`${CLAUDE_PLUGIN_ROOT}/workflows/compact.js`) and `args` = `{files, context}` (`files`: `[{path, owner}]`, e.g. `.team/system-design/<slug>.md` → architect).

## Done when

- Every milestone passed review and test and was shown to the user; the release check ran; the item is closed per orchestrator §6.
