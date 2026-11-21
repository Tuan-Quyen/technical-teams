---
name: run-kit
description: Reference for running the technical team — roster, commands, brief format, .team/ workspace, handoff. Load it when running a pipeline, writing a brief, reading a handoff, or when the user asks what the team or a command does; also before spawning team agents yourself, without a pipeline command, for work with more than one step or that may pause and be resumed.
---

# technical-team run kit

The core is this file. Read a reference (`${CLAUDE_PLUGIN_ROOT}/skills/run-kit/references/`) only when its step comes up:

| Reference | Holds | Read it when |
|---|---|---|
| `qa-loop.md` (§3 QA) | the QA-Fix loop, finding IDs, past the cap | reading a gate result; a round or approval question |
| `qa-lines.md` (§3 QA) | the verbatim qa and reviewer brief lines | writing an inline qa, reviewer or fix brief |
| `workspace.md` (§4) | every `.team/` file, its owner and template; the item JSON; spec rules; compaction | creating or checking a `.team/` file or the item |
| `roles.md` (§2) | who owns which quality check: developer, code-reviewer, qa | a gap or a duplicate check between those three |
| `workflow.md` (§6) | running a step through the Workflow tool, routing every `status` / `needsUser`, re-runs | a command says "workflow run" or "per run-kit §6" |

## 1. Roster

| Agent (`technical-team:…`) | Does | Writes |
|---|---|---|
| `team-lead` | classifies a request, runs the pipeline, keeps the item state | `items/<slug>.json`, moves into `archive/` |
| `team-ba` | requirements: stories, Given/When/Then ACs, edge cases, open questions | `requirements/<slug>.md`, `PRODUCT.md` |
| `team-designer` | design system, flows, screens, every state, copy | `frontend-design/DESIGN.md`, `frontend-design/<slug>.md` |
| `team-architect` | solution + implementation plan, architecture overview, ADRs | `system-design/<slug>.md`, `ARCHITECTURE.md`, `adr/` |
| `team-pm` | tickets, dependencies, parallel groups, milestones, ticket status | `TASKS.md` |
| `team-developer` | code changes per ticket or debug report, unit/component tests, self-check with evidence | source code, config, unit/component tests |
| `team-debugger` | reproduce, root cause with evidence, fix direction | handoff; `reports/<slug>/debug.md` at T2 |
| `team-code-reviewer` | review the diff, PASS / FAIL | findings in its result; `reports/<slug>/review.md` at T2 |
| `team-qa` | pre-check before build (checks, regression test, spec issues); execution after review (integration/E2E/acceptance, live preview, UX, regression, PASS / FAIL) | integration/E2E/acceptance tests; `reports/<slug>/qa.md` at T2 |
| `team-security` | vulnerability review of a diff or the repo, PASS / FAIL | findings in its result; `reports/<slug>/security.md` at T2 |
| `team-dba` | zero-downtime migrations, local/test databases only | migrations, "Data and migrations" in `system-design/<slug>.md` |
| `team-devops` | CI/CD, Docker, manifests, local verification, remote steps for the user | infra files |
| `team-writer` | README, API docs, CHANGELOG, runbooks | product docs, `docs/**` |

Paths are under `.team/`. Only the agent in the Writes column writes a file; everyone reads. Emoji, name, vibe and color: `.team/CREW.md` (from `core/CREW.md`; `/technical-team:crew` edits it).

**Project specialists** — the project's own agents in `.claude/agents/*.md`; the lead routes a step to one by its `description` (`team-lead.md` § Project specialists).

## 2. Pipeline workflow commands

`/technical-team:<command>`; each command file has its steps and tiers (`→` sequential, `∥` parallel).

| Command | Pipeline |
|---|---|
| `run <request>` | the lead classifies and picks one below; empty = resume from `STATE.md` |
| `crew [show · <agent> key=value · reset]` | shows or edits `CREW.md`; no agent |
| `feature` | T1: ba → developer → code-reviewer (∥ security, dba) → qa · T2: ba → (designer) → architect → pm → qa pre-check → developer → review → qa → writer |
| `feature --small` | T0, the user's flag: developer → code-reviewer |
| `fix` | T1: debugger → developer → code-reviewer (∥ security) → qa · T2 adds a qa pre-check |
| `review` | code-reviewer ∥ security (∥ dba); no code changes |
| `test` | qa writes missing tests |
| `infra` | devops proposal → devops → code-reviewer ∥ security → writer |
| `release` | qa ∥ security ∥ devops (∥ dba) → writer: GO / NO-GO |
| `new` | ba → architect ∥ designer → architect → pm → per milestone: build loop → compact → release |

Who owns which quality check (developer, code-reviewer, qa): `references/roles.md`.

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
Rules: write only the files under Write (none = advise only). Never write .team/items/ or STATE.md, never commit or push.
       Use the Tools line. Reading MCP is free; an outside change only if Constraints says the user allowed it.
Reply ending: the Handoff block of §5 (use your name; emoji ⬜).
```

### IDs people can read

Item **key**: 2–6 capitals or digits from the slug (`cart-checkout` → `CART`), in the item and its TASKS.md heading; it never changes. Tickets `CART-T1`, milestones `CART-M1` (pm); ACs `CART-AC1`, edge cases `CART-E1`, decisions `CART-D1` (ba, designer, architect); findings `F1` in the item (`CART#F1` elsewhere); `BR-1`, `G-1` in PRODUCT.md. To the user, an ID comes with its short title once per line: `F3 (save fails on second click)`. Old IDs (`T-1`, `AC1`…): `node ${CLAUDE_PLUGIN_ROOT}/tools/migrate-ids.mjs <project>`.

## 4. Workspace `.team/`

One owner per file (§1 Writes; `items/<slug>.json` is the orchestrating session's, `STATE.md` is generated from it); templates under `${CLAUDE_PLUGIN_ROOT}/templates/`. Item schema, spec rules, compaction: `references/workspace.md`.

### Orchestrating without the lead

Spawning team agents yourself, without a pipeline command, makes you the orchestrating session: the lead's bookkeeping for that work is yours.

- One step that finishes in one handoff → no item. Two or more steps, or work someone may resume later → before the first spawn, write `.team/items/<slug>.json` (pipeline `direct`), or update the open item that covers the work (never a second one); update it after each handoff.
- Finished → move its files to `archive/<slug>/` and delete the item JSON, as the lead's close step does. A lead subagent's returned plan → take over its item and continue from it.
- Spawned agents never write item state (a hook refuses them).

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

Running a step through the Workflow tool and routing its result (`status`, then each `needsUser`): `references/workflow.md`. Write `item` back before anything else.
