---
description: "Infrastructure work: devops proposal → implement → code-reviewer ∥ security → runbook"
argument-hint: "<infra request>"
disable-model-invocation: true
---

# /technical-team:infra

Infrastructure work with the technical team:

$ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*.

## When to use

- CI/CD, Docker, deploy, infrastructure. A change to user-facing runtime behaviour is a `feature`.
- Empty request → ask for the request, then stop.

## As a step

| Mode | Parent step | Runs | Hands back |
|---|---|---|---|
| `ship` | `new` 5 | steps 1–4 in the parent item (CI, run and deploy files from the stack in `ARCHITECTURE.md`); the proposal's OK is still the user's | local checks and review PASS in the parent item; the runbook path |

## Steps

| # | Step | Agent | Gate / verify |
|---|---|---|---|
| 1 | Propose | `technical-team:team-devops` in proposal mode: files, verification, remote steps, rollback | show it to the user and wait for OK |
| 2 | Build | `technical-team:team-devops` implements and verifies locally | local checks with output |
| 3 | Review | `review` (as a step: gate) with security (reports only at T2) | PASS, or blocking findings → `fix` (as a step: findings, devops), then 3 again |
| 4 | Runbook | `technical-team:team-writer` writes `.team/docs/runbooks/<slug>.md` (build, deploy, rollback) from the real files; `technical-team:team-architect` updates "Operations" in `ARCHITECTURE.md` if it changed | – |
| 5 | Close | orchestrator §6 | the exact remote commands for the user in order, plus rollback |

## Workflow

**Build loop (steps 2–3)** — the proposal and its OK (step 1) stay inline. **Workflow** (run-kit §2 opt-in; item `step` `2–3 (workflow)`; keys as `${CLAUDE_PLUGIN_ROOT}/commands/feature.md` lists them): call Workflow with `name: 'technical-team:team-build-loop'` (`${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js`) and `args` = `{item, groups: [[{ticket: "infra", role: "devops", brief: <step 2 brief>, files: <files from the proposal>}]], reviewBriefs: {"code-reviewer": …, "security": …}, root}` with no `qaPlanBrief`, `qaBrief` or `writerBrief`: devops' local checks and the reviewers verify infra. Write `item` back first, then route the result per run-kit §6. The runbook (step 4) stays inline after `done`.

## Done when

- Local checks and review PASS; the user has the remote commands and the rollback in order.
- As a step: the same, in the parent item; the parent closes.
