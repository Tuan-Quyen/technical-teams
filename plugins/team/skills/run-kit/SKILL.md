---
name: run-kit
description: Reference for running the technical team — the roster (who does what, writes what), the pipeline workflow commands, how to write a brief, the .team/ workspace with its templates, and the handoff every agent returns. Load it when running a pipeline, writing a brief, reading a handoff, or when the user asks what the team or a command does.
---

# technical-team run kit

## 1. Roster

| Agent (`technical-team:…`) | Does | Writes |
|---|---|---|
| `team-lead` | classifies a request, runs the pipeline, keeps the resume point | `STATE.md`, moves into `archive/` |
| `team-ba` | requirements: stories, Given/When/Then ACs, edge cases, open questions | `requirements/<slug>.md`, `PRODUCT.md` |
| `team-designer` | design system, flows, screens, every state, copy | `frontend-design/DESIGN.md`, `frontend-design/<slug>.md` |
| `team-architect` | solution + implementation plan, architecture overview, ADRs | `system-design/<slug>.md`, `ARCHITECTURE.md`, `adr/` |
| `team-pm` | tickets, dependencies, parallel groups, milestones, ticket status | `TASKS.md` |
| `team-developer` | code changes per ticket or debug report, self-check | source code, config |
| `team-debugger` | reproduce, root cause with evidence, fix direction | `reports/<slug>/debug.md` |
| `team-code-reviewer` | review the diff, PASS / FAIL | `reports/<slug>/review.md` |
| `team-qa` | test plan, RTM, tests, live preview, PASS / FAIL | test files, `reports/<slug>/qa.md` |
| `team-security` | vulnerability review of a diff or the repo, PASS / FAIL | `reports/<slug>/security.md` |
| `team-dba` | zero-downtime migrations, local/test databases only | migrations, "Data and migrations" in `system-design/<slug>.md` |
| `team-devops` | CI/CD, Docker, manifests, local verification, remote steps for the user | infra files |
| `team-writer` | README, API docs, CHANGELOG, runbooks | product docs, `docs/**` |

Paths are under `.team/`. Only the agent in the Writes column writes a file; everyone reads.

## 2. Pipeline workflow commands

`→` sequential, `∥` parallel. Each command file lists its steps; this is the map.

| Command | For | Pipeline | Stops for the user at |
|---|---|---|---|
| `feature` | a new capability or behaviour change | ba → designer (UI) → architect (+dba) → pm → developer → code-reviewer ∥ security → qa → writer | ba questions, design OK |
| `feature --small` | a change that fits existing patterns | developer → code-reviewer → qa | — |
| `fix` | a bug, error, failing test | debugger → developer → code-reviewer (∥ security) → qa | risky fix options |
| `review` | a diff, branch or range; no code changes | code-reviewer ∥ security (∥ dba) | — |
| `test` | missing tests for a scope | qa | — |
| `infra` | CI/CD, Docker, deploy | devops (proposal) → devops → code-reviewer ∥ security → writer | proposal OK |
| `release` | release readiness, GO / NO-GO | qa ∥ security ∥ devops (∥ dba) → writer | — |
| `new` | a product from an idea or PRD | ba → architect ∥ designer → architect → pm → per milestone: developer → review → qa → devops → writer → release | ba questions, stack, milestones |

Loops: review or QA `FAIL` → back to the developer with the finding IDs, then review again. Unclear failure → debugger. Design looks wrong → architect. Same findings after 3 rounds → ask the user.

## 3. Writing a brief

Every agent starts cold and sees only the brief. Give it:

```
Item: <slug> · Pipeline: <name> · Step: <n — name> · Ticket: <T-n or –>
Goal: <what this step must produce>
Read: <the .team/ files and code paths it needs>
Write: <the files it owns for this step>
Constraints: <scope, user decisions so far, finding IDs to fix, ADR number if any>
User's language: <language>
```

- Name files, not "the findings above": the agent cannot see the conversation.
- Pass user answers verbatim.
- Parallel agents never share a file in **Write**.

## 4. Workspace `.team/`

| File | Owner | Template (`${CLAUDE_PLUGIN_ROOT}/templates/…`) |
|---|---|---|
| `STATE.md` — who works on what, files in use, next step (resume point) | lead | `core/STATE.md` |
| `TASKS.md` — tickets and status | pm | `core/TASKS.md` |
| `PRODUCT.md` — current truth of the product | ba | `core/PRODUCT.md` |
| `ARCHITECTURE.md` — overview, ~200 lines max, points to ADRs | architect | `core/ARCHITECTURE.md` |
| `requirements/<slug>.md` | ba | `requirements/requirements.md` |
| `system-design/<slug>.md` — design + implementation plan | architect (dba: Data and migrations) | `design/system-design.md` |
| `frontend-design/DESIGN.md` — design system | designer | `design/DESIGN.md` |
| `frontend-design/<slug>.md` | designer | `design/frontend-design.md` |
| `adr/NNNN-<decision>.md` — NNNN given by the lead | architect | `adr/adr.md` |
| `reports/<slug>/qa.md` — plan → RTM → findings → latest round → verdict | qa | `reports/qa.md` |
| `reports/<slug>/review.md` | code-reviewer | `reports/review.md` |
| `reports/<slug>/security.md` | security | `reports/security.md` |
| `reports/<slug>/debug.md` | debugger | `reports/debug.md` |
| `docs/**` | writer | — |
| `archive/<slug>/` — every file of a closed item | lead | — |

Reports keep a cumulative findings table with fixed IDs (`Q-01`, `R-01`, `S-01`) and only the latest round in detail; line 1 is the verdict.

## 5. Handoff

Every agent ends its reply with:

```
### Handoff
- Status: done | blocked | needs-input
- Files: <created / changed, or "none">
- Evidence: <commands run and their result, or "none">
- Next: <agent or "user"> — <what>
```

| Status | Means | Next move |
|---|---|---|
| `done` | step finished, evidence attached | next step of the pipeline (no evidence → treat as `blocked`) |
| `blocked` | cannot continue | debugger for an unclear failure, architect for a design problem, otherwise the user |
| `needs-input` | a decision belongs to the user | ask the user, pass the answer back verbatim |
