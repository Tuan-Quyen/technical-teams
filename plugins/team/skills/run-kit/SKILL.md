---
name: run-kit
description: Reference for running the technical team — the roster (who does what, writes what), the pipeline workflow commands, how to write a brief, the .team/ workspace with its templates, and the handoff every agent returns. Load it when running a pipeline, writing a brief, reading a handoff, or when the user asks what the team or a command does. Also load it before spawning team agents yourself, without a pipeline command, for work with more than one step or that may pause and be resumed.
---

# technical-team run kit

The core is this file. Read a reference (`${CLAUDE_PLUGIN_ROOT}/skills/run-kit/references/`) only when its step comes up:

| Reference | Holds | Read it when |
|---|---|---|
| `qa-loop.md` (§3 QA) | the qa, tracker and developer brief lines, qa report minimum, reading a qa FAIL, finding tracker, QA-Fix round, more than 3 rounds | writing a qa, reviewer or fix brief; reading a qa result; a round or approval question |
| `workspace.md` (§4) | every `.team/` file, its owner and template; writing style | creating or checking a `.team/` file |
| `workflow.md` (§6) | running a step through the Workflow tool, routing every `status` / `needsUser`, re-runs | a command says "workflow run" or "per run-kit §6" |

## 1. Roster

| Agent (`technical-team:…`) | Does | Writes |
|---|---|---|
| `team-lead` | classifies a request, runs the pipeline, keeps the resume point | `STATE.md`, moves into `archive/` |
| `team-ba` | requirements: stories, Given/When/Then ACs, edge cases, open questions | `requirements/<slug>.md`, `PRODUCT.md` |
| `team-designer` | design system, flows, screens, every state, copy | `frontend-design/DESIGN.md`, `frontend-design/<slug>.md` |
| `team-architect` | solution + implementation plan, architecture overview, ADRs | `system-design/<slug>.md`, `ARCHITECTURE.md`, `adr/` |
| `team-pm` | tickets, dependencies, parallel groups, milestones, ticket status | `TASKS.md` |
| `team-developer` | code changes per ticket or debug report, unit/component tests, self-check with evidence | source code, config, unit/component tests |
| `team-debugger` | reproduce, root cause with evidence, fix direction | `reports/<slug>/debug.md` |
| `team-code-reviewer` | review the diff, PASS / FAIL | `reports/<slug>/review.md` |
| `team-qa` | pre-check before build (test plan, RTM, spec issues); execution after review (integration/E2E/acceptance, live preview, UX, regression, PASS / FAIL) | integration/E2E/acceptance tests, `reports/<slug>/qa.md` |
| `team-security` | vulnerability review of a diff or the repo, PASS / FAIL | `reports/<slug>/security.md` |
| `team-dba` | zero-downtime migrations, local/test databases only | migrations, "Data and migrations" in `system-design/<slug>.md` |
| `team-devops` | CI/CD, Docker, manifests, local verification, remote steps for the user | infra files |
| `team-writer` | README, API docs, CHANGELOG, runbooks | product docs, `docs/**` |

Paths are under `.team/`. Only the agent in the Writes column writes a file; everyone reads. Emoji, name, vibe and badge color live in `.team/CREW.md` (created from `core/CREW.md` with the defaults; edit it by hand or with `/technical-team:crew`).

**Project specialists** — agents the project defines in `.claude/agents/*.md` (e.g. `prisma-expert`, `payments-reviewer`). The lead lists them at start, matches a step to one by its `description`, and either lets it **replace** the team agent for that step or **consults** it first (`team-lead.md` § Project specialists). They may declare `mcpServers`, `hooks` and `permissionMode`, which plugin agents cannot; that is the reason to write one instead of a project skill.

## 2. Pipeline workflow commands

All commands are `/technical-team:<command>` (`→` sequential, `∥` parallel). Each command file lists its steps; this is the map.

| Command | For | Pipeline | Stops for the user at |
|---|---|---|---|
| `run <request>` | the entry point | the lead classifies the request and picks one pipeline below; empty = resume from `STATE.md` | — |
| `crew [show · <agent> key=value · reset]` | the crew's look | shows or edits `CREW.md`; spawns no agent | — |
| `feature` | a new capability or behaviour change | ba → designer (UI) → architect (+dba) → pm → qa pre-check → developer → code-reviewer ∥ security → qa → writer | ba questions, design OK, pre-check spec issues |
| `feature --small` | a change that fits existing patterns | developer → code-reviewer (∥ security) → qa (→ writer); no pre-check: the brief's bullets are the RTM | — |
| `fix` | a bug, error, failing test | debugger → qa pre-check (regression test defined) → developer → code-reviewer (∥ security) → qa | risky fix options, pre-check spec issues |
| `review` | a diff, branch or range; no code changes | code-reviewer ∥ security (∥ dba) | — |
| `test` | missing tests for a scope | qa | — |
| `infra` | CI/CD, Docker, deploy | devops (proposal) → devops → code-reviewer ∥ security → writer | proposal OK |
| `release` | release readiness, GO / NO-GO | qa ∥ security ∥ devops (∥ dba) → writer | — |
| `new` | a product from an idea or PRD | ba → architect ∥ designer → architect → pm → per milestone: qa pre-check → developer → review → qa → devops → writer → release | ba questions, stack, milestones, pre-check spec issues |

**Workflow-backed steps** — `review`, `release`, the build loop of `feature`, `fix`, `infra` and `new` (`build-loop.js`) and the ticket check of `feature` and `new` (`plan-tickets.js`) may run through the Workflow tool: the lead writes every §3 brief, the script spawns the agents and returns `needsUser` for the lead to route (§6). They run only when the tool is available AND the user typed a slash command of this plugin for the item (`/technical-team:run` counts); otherwise the inline steps run, and the STATE row records `workflows: yes|no` so a resumed item keeps its choice.

Loops: review or QA `FAIL` → back to the developer with the finding IDs, then review again. Unclear failure → debugger. Design looks wrong → architect. 3 QA-Fix rounds per item, then stop for the user (§3 *QA-Fix round*). QA pre-check spec issue → its owner (ba, designer or architect) or the user; nothing is built until it is resolved or the user accepts it.

**Who owns which quality check** — one owner per check, no duplicate tests:

| Check | developer | code-reviewer | qa |
|---|---|---|---|
| unit/component tests (happy, negative, boundary, error paths) | writes + runs | reviews: meaningful, not weakened or skipped | finds gaps → finding for developer |
| build, lint, related suites, smoke | runs before handoff, evidence in Handoff | re-runs unless green CI covers the current commit and a clean tree | checks the evidence (entry criteria) |
| correctness, requirements/design fit, error handling, contracts, regression risk | self-check against the RTM | reviews the diff | — |
| test plan, RTM, AC review, risk | reads the RTM before coding | — | pre-check, before any code |
| integration, E2E, acceptance, live preview, UX, exploratory, regression | — | — | execution, after review PASS |
| PASS / FAIL of the product | never claims it | review verdict only | final verdict |

## 3. Writing a brief

Every agent starts cold and sees only the brief. Give it:

```
Item: <slug> · Key: <KEY> · Pipeline: <name> · Step: <n — name> · Ticket: <<KEY>-T<n> or –>
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

### IDs people can read (both paths)

Each item has a **key**: 2–6 capitals or digits, first a capital, from its slug (`cart-checkout` → `CART`; taken → `CARTCK` or `CART2`). The lead picks it when the item starts and writes it in STATE.md (Active work, QA-Fix state) and the item's TASKS.md heading; it never changes.

| ID | Is | Given by |
|---|---|---|
| `CART-T1` | a ticket in TASKS.md | pm (plan-tickets checks the form) |
| `CART-B1` | a bug or finding in the tracker (qa or a reviewer): what the user sees | the workflow / the lead, once |
| `CART-AC1` · `CART-E1` · `CART-D1` | acceptance criterion · edge case · decision | ba (designer, architect for decisions) |
| `CART-M1` | a milestone (`new`) | pm |
| `CART-R1` · `CART-S1` · `CART-Q1` | a finding in review.md · security.md · qa.md (its `sourceId`) | that gate |
| `BR-1` · `G-1` | business rule · goal, product-wide in PRODUCT.md (one per project, no key) | ba |

- Anything written for the user (reports, handoff summaries, STATE `Next step`, chat) gives an ID its short title the first time in a line: `CART-B3 (save fails on second click)`, never a bare ID.
- To the user, a finding is its bug ID (`CART-B3`); the gate's own `CART-R1` / `CART-S1` / `CART-Q1` stays inside the reports as the cross-reference.
- Old projects (`T-1`, `F-001`, `AC1`, `E1`, `M1`, `Q-D1`, `R-01`, `S-01`, `Q-01`): `node ${CLAUDE_PLUGIN_ROOT}/tools/migrate-ids.mjs <project>` (dry run; `--write` to apply; `--all` also covers docs and source comments outside `.team/`).

**QA lines and loop rules** — the verbatim qa, tracker and developer-RTM lines, the qa report minimum, how a qa FAIL is read, the finding tracker, the QA-Fix round and what happens past 3 rounds: `references/qa-loop.md`. Read it before any qa, reviewer or fix brief.

## 4. Workspace `.team/`

Paths in this kit are under `.team/`. Each file has one owner (the Writes column of §1; `STATE.md` and `reports/<slug>/findings.md` belong to the orchestrating session) and a template under `${CLAUDE_PLUGIN_ROOT}/templates/`. The full table, the Budget rule and the writing style: `references/workspace.md`.

### Orchestrating without the lead

Spawning team agents yourself, without a pipeline command, makes you the orchestrating session: the lead's bookkeeping for that work is yours.

- One step that finishes in one handoff → no `STATE.md` row. Two or more steps, or work someone may resume later → before the first spawn, add a row from `core/STATE.md` (Pipeline: `direct`), or update the open row that covers the item (never a second one); overwrite it after each handoff.
- Item finished → remove its row and move its files to `archive/<slug>/`, as the lead's close step does.
- Same rules as the lead: `Next step` ≤ 30 words, overwrite, never append, whole file within its Budget. A lead subagent's returned plan → take over its `STATE.md` row and continue from it.
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

## 6. Workflow steps

How a command runs a step through the Workflow tool, and how to route its result: `references/workflow.md`. Read it before the call; route every result by it (`status`, then each `needsUser` entry), and write `state` and `tracker` back before anything else.
