---
name: run-kit
description: Reference for running the technical team: roster, pipelines and their shared rules, brief format, .team/ workspace, handoff. Load it when running a pipeline, writing a brief, reading a handoff, or when the user asks what the team or a command does; also before spawning team agents yourself for work with more than one step or that may be resumed.
---

# technical-team run kit — roster, pipelines, briefs, workspace, handoff

## When to load

Running a pipeline, writing a brief or reading a handoff; before spawning team agents yourself for multi-step work. Read a reference only when its step comes up (§ References).

## 1. Roster

| Agent (`technical-team:…`) | Color | Does | Writes |
|---|---|---|---|
| `team-orchestrator` | purple | classifies a request, runs the pipeline, keeps the item state | `items/<slug>.json`, moves into `archive/` |
| `team-ba` | cyan | requirements: stories, Given/When/Then ACs, edge cases, open questions | `requirements/<slug>.md`, `PRODUCT.md` |
| `team-designer` | pink | design system, flows, screens, every state, copy | `frontend-design/DESIGN.md`, `frontend-design/<slug>.md` |
| `team-architect` | blue | solution + implementation plan, architecture overview, ADRs | `system-design/<slug>.md`, `ARCHITECTURE.md`, `adr/` |
| `team-pm` | yellow | PM / Scrum Master: tickets with day estimates, dependencies, owners, parallel groups, milestones, sprints, progress, risks, status report | `TASKS.md` (task board) |
| `team-developer` | green | code changes per ticket or debug report, unit/component tests, self-check with evidence | source code, config, unit/component tests |
| `team-debugger` | orange | reproduce, root cause with evidence, fix direction | handoff; `reports/<slug>/debug.md` at T2 |
| `team-code-reviewer` | red | review the diff, PASS / FAIL | findings in its result; `reports/<slug>/review.md` at T2 |
| `team-qa` | yellow | pre-check before build (checks, regression test, spec issues); execution after review (integration/E2E/acceptance, live preview, UX, regression, PASS / FAIL) | integration/E2E/acceptance tests; `reports/<slug>/qa.md` at T2; `ISSUES.md` (triage) |
| `team-security` | red | vulnerability review of a diff or the repo, PASS / FAIL | findings in its result; `reports/<slug>/security.md` at T2 |
| `team-dba` | blue | zero-downtime migrations, local/test databases only | migrations, "Data and migrations" in `system-design/<slug>.md` |
| `team-devops` | green | CI/CD, Docker, manifests, local verification, remote steps for the user | infra files |
| `team-writer` | cyan | README, API docs, CHANGELOG, runbooks | product docs, `docs/**` |
| `team-retrospector` | purple | audits the team from local transcripts, `.team/`, git and the plugin definitions (skill `retrospect`), proposes plugin changes with evidence | `retrospect/<YYYY-MM-DD>/` |

Paths are under `.team/`. Only the agent in the Writes column writes a file; everyone reads. Color = the agent's frontmatter `color:` (its UI label and spawn badge); a color groups roles: red gates · green builders · blue design/data · yellow planning/checking · cyan words/needs · purple the team itself.

**Project specialists** — the project's own agents in `.claude/agents/*.md`; the orchestrator routes a step to one by its `description` (`team-orchestrator.md` § Project specialists).

## 2. Pipelines

The orchestrator picks the command from the request; `/technical-team:<command>` runs one directly. `→` sequential, `∥` parallel.

| The request is… | Command | Pipeline |
|---|---|---|
| anything; empty = resume from `STATE.md` | `run <request>` | the orchestrator classifies it into a row below |
| a new capability, or a change to how the product behaves | `feature` | T1: ba → developer → code-reviewer (∥ security, dba) → qa · T2: ba → (designer) → architect → pm → qa pre-check → developer → review → qa → writer |
| small and in existing patterns (the user's flag only; the orchestrator may suggest it, never choose it) | `feature --small` | T0: developer → code-reviewer |
| a bug, an error, a failing test, wrong behaviour | `fix` | T1: debugger → developer → code-reviewer (∥ security) → qa · T2 adds a qa pre-check |
| review / check this diff / audit security | `review` | code-reviewer ∥ security (∥ dba); no code changes |
| add tests / is this covered | `test` | qa writes missing tests |
| sort / rank issues, or several bugs or issues at once | `triage [list]` | qa ranks `ISSUES.md`; no item; the pick goes to `fix` or `feature` |
| standup / status / progress / sprint / risks / plan a sprint | `standup [close · plan [<weeks> <days>] [<goal or epic>]]` | pm writes the status report on `TASKS.md`; `close` ends the sprint; `plan` runs the plan skill's sprint steps (ba → architect → pm → your OK); no item unless a new epic |
| how has the team done / retro / what should the team change | `retrospect [days]` | retrospector audits the team (skill `retrospect`) and proposes plugin changes; no item |
| CI/CD, Docker, deploy, infrastructure | `infra` | devops proposal → devops → code-reviewer ∥ security → writer |
| ready to release? / prepare version X | `release` | qa ∥ security ∥ devops (∥ dba) → writer: GO / NO-GO |
| a new product from an idea or PRD, no application code yet | `new` | ba → architect ∥ designer → architect → pm → per milestone: build loop → compact → release |
| record an architecture decision | – | brief `team-architect` for an ADR; no pipeline |
| a question, or one small task for one role | – | answer it, or brief that one agent; no item |

A bug that matches an open `.team/ISSUES.md` row → `fix I<n>` on that row, never a new one. Unsure between two rows → ask the user one short question.

### Running a pipeline

- **Who runs it** — the session running a command is the orchestrator: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-orchestrator.md` §3–§6, Read it if you are not already the orchestrator. `triage`, `standup` and `retrospect` open no item (a new epic in `standup plan` opens its item as `feature`): only its Rules and §4 apply.
- **Issue ID** — a request that is `I<n>` → that `.team/ISSUES.md` row is the request; set its `status` to `in-progress` and `item` to this item's slug.
- **Tier** (`feature`, `fix`; written in the item; the user forces one with `--tier`) — **T2**: new screen flow, new contract or module, auth or permissions, payment processing (charging, refunds, payouts), schema migrations, or deleting or rewriting stored data; calculation logic that tests cover (prices, totals, tax) is not T2. **T1**: everything else. **T0**: `feature --small` only. Raise a tier at any step when the work turns out bigger; lowering one needs the reason in the item's `notes`.
- **Task list** — before the first spawn, put the command's steps on the session's task list (orchestrator §3 *Task list*). No task tool → carry on: the item is the truth.
- **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (the command itself, or `/technical-team:run`, which hands the chosen pipeline to the orchestrator) → run the command's workflow step (§6). Otherwise (no tool, or the orchestrator was started without a slash command) → run the command's steps inline.
- **Check-only** (`review`, `test`) — close by deleting the command's own item JSON and moving its `reports/<slug>/` (if any) to `.team/archive/<slug>/`. A build-loop item in scope (it has `.team/items/<slug>.json`) is never changed, closed or reported PASS or ready by them: only its own pipeline closes it.
- **Outside changes** — never commit, push, tag, deploy or publish unless the user asks; give the user the exact commands.

## 3. Writing a brief

Every agent starts cold and sees only the brief. Give it:

```
Item: <slug> · Key: <KEY> · Pipeline: <name> · Step: <n — name> · Ticket: <<KEY>-T<n> or –>
Goal: <what this step must produce>
Read: <the .team/ files and code paths it needs>
Write: <the files it owns for this step>
Constraints: <scope, user decisions so far (verbatim + date; each is consent only for the action it names), finding IDs to fix, ADR number if any, which outside changes the user allowed>
Tools: <skills / mcp__server__* / commands this step needs, each with what it is for — chosen by the orchestrator for this step; none → –>
User's language: <language>
Reply: end with the §5 `### Handoff`
```

- Name files, not "the findings above": the agent cannot see the conversation.
- Pass user answers verbatim.
- Parallel agents never share a file in **Write**, and never share tree-wide state: no installs or whole-tree formatters while others run. Name the parallel agents under **Constraints** (`parallel with: qa, devops`) so each one holds back.

**Briefing a project specialist** — it has none of the team's Rules, so the brief carries them. Use the format above, then add:

```
Rules: write only the files under Write (none = advise only). Never write .team/items/ or STATE.md, never commit or push.
       Use the Tools line. Reading MCP is free; an outside change only if Constraints says the user allowed it.
Reply ending: the Handoff block of §5.
```

## 4. Workspace `.team/`

One owner per file (§1 Writes; `items/<slug>.json` is the orchestrating session's, `STATE.md` is generated from it); templates under `${CLAUDE_PLUGIN_ROOT}/templates/`. Item schema, readable IDs, spec rules, compaction: `references/workspace.md`.

### Orchestrating without the orchestrator

Spawning team agents yourself, without a pipeline command, makes you the orchestrating session: the orchestrator's bookkeeping for that work is yours.

- One step that finishes in one handoff → no item. Two or more steps, or work someone may resume later → before the first spawn, write `.team/items/<slug>.json` (pipeline `direct`), or update the open item that covers the work (never a second one); update it after each handoff.
- Finished → move its files to `archive/<slug>/` and delete the item JSON, as the orchestrator's close step does. An orchestrator subagent's returned plan → take over its item and continue from it.
- Spawned agents never write item state (specialist-rules).

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
| `done` | step finished, evidence attached | next step of the pipeline (no evidence → treat as `blocked`; no Handoff block → ask the agent for it first) |
| `blocked` | cannot continue | debugger for an unclear failure, architect for a design problem, otherwise the user |
| `needs-input` | a decision belongs to the user | ask the user, pass the answer back verbatim |

Who decides each call (ticket status, closing, severity, ISSUES rows, defer): `references/roles.md` § Who decides.

## 6. Workflow steps

Running a step through the Workflow tool and routing its result (`status`, then each `needsUser`): `references/workflow.md`. Write `item` back before anything else.

## References

Under `${CLAUDE_PLUGIN_ROOT}/skills/run-kit/references/`:

| Reference | Holds | Read when |
|---|---|---|
| `qa-loop.md` (§3 QA) | the QA-Fix loop, finding IDs, past the cap | reading a gate result; a round or approval question |
| `qa-lines.md` (§3 QA) | the verbatim qa and reviewer brief lines | writing an inline qa, reviewer or fix brief |
| `workspace.md` (§4) | every `.team/` file, its owner and template; the item JSON; readable IDs; spec rules; compaction | creating or checking a `.team/` file or the item |
| `roles.md` (§2, §5) | who owns which quality check (developer, code-reviewer, qa), and who decides each call on the work | a gap or duplicate check between those three; recording a verdict or decision |
| `workflow.md` (§6) | running a step through the Workflow tool, routing every `status` / `needsUser`, re-runs | a command says "workflow run" or "per run-kit §6" |
