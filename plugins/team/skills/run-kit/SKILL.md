---
name: run-kit
description: Reference for running the technical team — the roster (who does what, writes what), the pipeline workflow commands, how to write a brief, the .team/ workspace with its templates, and the handoff every agent returns. Load it when running a pipeline, writing a brief, reading a handoff, or when the user asks what the team or a command does. Also load it before spawning team agents yourself, without a pipeline command, for work with more than one step or that may pause and be resumed.
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

Paths are under `.team/`. Only the agent in the Writes column writes a file; everyone reads. Emoji, name, vibe and badge color live in `.team/CREW.md` (created from `core/CREW.md` with the defaults; edit it by hand or with `/technical-team:crew`).

**Project specialists** — agents the project defines in `.claude/agents/*.md` (e.g. `prisma-expert`, `payments-reviewer`). The lead lists them at start, matches a step to one by its `description`, and either lets it **replace** the team agent for that step or **consults** it first (`team-lead.md` § Project specialists). They may declare `mcpServers`, `hooks` and `permissionMode`, which plugin agents cannot; that is the reason to write one instead of a project skill.

## 2. Pipeline workflow commands

All commands are `/technical-team:<command>`. Two are not pipelines:

| Command | Does |
|---|---|
| `run <request>` | the entry point: the lead classifies the request and picks one pipeline below; empty = resume from `STATE.md` |
| `crew [show · <agent> key=value · reset]` | shows or edits `CREW.md`; spawns no agent |

The pipelines (`→` sequential, `∥` parallel). Each command file lists its steps; this is the map.

| Command | For | Pipeline | Stops for the user at |
|---|---|---|---|
| `feature` | a new capability or behaviour change | ba → designer (UI) → architect (+dba) → pm → developer → code-reviewer ∥ security → qa → writer | ba questions, design OK |
| `feature --small` | a change that fits existing patterns | developer → code-reviewer (∥ security) → qa (→ writer) | — |
| `fix` | a bug, error, failing test | debugger → developer → code-reviewer (∥ security) → qa | risky fix options |
| `review` | a diff, branch or range; no code changes | code-reviewer ∥ security (∥ dba) | — |
| `test` | missing tests for a scope | qa | — |
| `infra` | CI/CD, Docker, deploy | devops (proposal) → devops → code-reviewer ∥ security → writer | proposal OK |
| `release` | release readiness, GO / NO-GO | qa ∥ security ∥ devops (∥ dba) → writer | — |
| `new` | a product from an idea or PRD | ba → architect ∥ designer → architect → pm → per milestone: developer → review → qa → devops → writer → release | ba questions, stack, milestones |

**Workflow-backed steps** — a command may run its parallel steps through the Workflow tool (`review`, `release`, the build loop of `feature`, `fix`, `infra` and `new` in `build-loop.js`, and the ticket check of `feature` and `new` in `plan-tickets.js` (pm writes, code checks, pm fixes); scripts in `${CLAUDE_PLUGIN_ROOT}/workflows/`). The lead still writes every §3 brief and passes them in `args`; the script spawns the agents with a result schema (status, verdict, findings, handoff) and returns `needsUser` entries (blocked, needs-input, agent died) for the lead to route per §5. `STATE.md` is set to `running` before the launch and updated when the result arrives. Call each by name (`technical-team:team-review`, `team-release`, `team-build-loop`, `team-plan-tickets`); only if the name is not found, Read the file and pass its text as `script`. `build-loop` also runs the FAIL loops (fix, re-review, re-qa, up to `maxRounds`) and the group check after parallel tickets; it returns `stuck` or `stopped` for the lead to route, and a re-run passes the full `groups` with `startAt` / `fromGroup` for where to resume. Workflows run only when the tool is available AND the user typed a slash command of this plugin for the item (`/technical-team:run` counts); otherwise the command's inline steps run, and the STATE row records `workflows: yes|no` so a resumed item keeps its choice.

Loops: review or QA `FAIL` → back to the developer with the finding IDs, then review again. Unclear failure → debugger. Design looks wrong → architect. Same findings after 3 rounds → ask the user.

## 3. Writing a brief

Every agent starts cold and sees only the brief. Give it:

```
Item: <slug> · Pipeline: <name> · Step: <n — name> · Ticket: <T-n or –>
Goal: <what this step must produce>
Read: <the .team/ files and code paths it needs>
Write: <the files it owns for this step>
Constraints: <scope, user decisions so far (verbatim + date; each is consent only for the action it names), finding IDs to fix, ADR number if any, which outside changes the user allowed>
Tools: <skills / mcp__server__* / commands this step needs, each with what it is for — chosen by the lead for this step; none → –>
User's language: <language>
Reply: open with `<emoji> <name>:` · end with `### Handoff · <emoji> <name>` (row in `.team/CREW.md`)
```

- Name files, not "the findings above": the agent cannot see the conversation.
- Pass user answers verbatim.
- Parallel agents never share a file in **Write**, and never share tree-wide state: no installs or whole-tree formatters while others run. Name the parallel agents under **Constraints** (`parallel with: qa, devops`) so each one holds back.

**Briefing a project specialist** — it has none of the team's Rules, so the brief carries them. Use the format above, then add:

```
Rules: write only the files under Write (none = advise only). Never write .team/STATE.md, never commit or push.
       Use the Tools line. Reading MCP is free; an outside change only if Constraints says the user allowed it.
Reply ending: the Handoff block of §5 (use your name; emoji ⬜).
```

## 4. Workspace `.team/`

| File | Owner | Template (`${CLAUDE_PLUGIN_ROOT}/templates/…`) |
|---|---|---|
| `STATE.md` — who works on what, files in use, next step (resume point) | the orchestrating session: lead, or whoever spawns agents directly | `core/STATE.md` |
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
| `CREW.md` — emoji, names, vibes, badge colors | lead creates it; the user customizes it | `core/CREW.md` |
| `docs/**` | writer | — |
| `archive/<slug>/` — every file of a closed item | lead | — |

Reports keep a cumulative findings table with fixed IDs (`Q-01`, `R-01`, `S-01`) and only the latest round in detail; line 1 is the verdict.

**Writing style (every `.team/` file)** — each file is read by a human skimming and by every agent that starts cold, so length costs tokens on every spawn:
- Bullets and table cells, not paragraphs; one fact per bullet (~20 words); outcome first.
- Point, do not explain: `file:line`, commit, test name, finding or ticket ID, ADR number.
- Current truth only: overwrite stale lines; history lives in git, not in the file.
- One home per fact; elsewhere, link it.
- Each template has a **Budget** line. Count every line, blank ones too: the last line number of a `Read`, or `wc -l` / `(Get-Content f).Count` (not `Measure-Object -Line`, which skips blank lines). Over it → cut, collapse closed rows into an ID line, or split by milestone. When a handoff leaves a file over budget, send it back to its owner before you move on.

### Orchestrating without the lead

Spawning team agents yourself, without a pipeline command, makes you the orchestrating session: the lead's bookkeeping for that work is yours.

- One step that finishes in one handoff → no `STATE.md` row.
- Two or more steps, or work someone may resume later → before the first spawn, add a row from `core/STATE.md` (Pipeline: `direct`). After each handoff, overwrite it.
- An open row already covers the item → update that row; never add a second one.
- Item finished → remove its row and move its files to `archive/<slug>/`, as the lead's close step does.
- Same rules as the lead: `Next step` ≤ 30 words, overwrite, never append, whole file within its Budget.
- A lead subagent's returned plan → take over its `STATE.md` row and continue from it.
- Spawned agents never write `STATE.md`.

## 5. Handoff

Every agent opens its reply with `<emoji> <name>:` and ends it with:

```
### Handoff · <emoji> <name>
- Status: done | blocked | needs-input
- Files: <created / changed, or "none">
- Evidence: <commands run and their result, or "none">
- Next: <agent or "user"> — <what>
```

| Status | Means | Next move |
|---|---|---|
| `done` | step finished, evidence attached | next step of the pipeline (no evidence → treat as `blocked`; no Handoff block → ask the agent for it first) |
| `blocked` | cannot continue | debugger for an unclear failure, architect for a design problem, otherwise the user |
| `needs-input` | a decision belongs to the user | ask the user, pass the answer back verbatim |
