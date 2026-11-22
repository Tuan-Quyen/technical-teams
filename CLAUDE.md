# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is — read first

**This repo builds the configuration of a technical agent team (a Claude Code plugin). It is NOT a product project.**

- The deliverable is prompts and config: agent definitions, slash commands, skills, templates, hooks and workflow scripts under `plugins/team/`, distributed through the marketplace in `.claude-plugin/marketplace.json`.
- "Building a feature" here means changing how the team behaves (an agent's prompt, a pipeline, a hook rule, a template), not writing application code.
- Do not run the team's own pipelines (`/technical-team:feature`, `fix`, `new`, …) to change this repo, and do not treat it as a target project of the team. The `technical-team:team-*` agents available in the session are the *installed* copy of this plugin, which may differ from the source being edited.
- `example/pomodoro-timer/` is a sample product the plugin built (`BRIEF.md` = the run's brief, `PLUGIN-REPORT.md` = findings about the plugin). It is evidence of plugin behaviour, not code to develop; it has its own `package.json` and CI (`.github/workflows/pomodoro-timer.yml`).
- Root `.team/` and `docs/` are gitignored on purpose (local scratch / redesign notes). Never commit them.

User-facing docs (README, CHANGELOG) are written in Vietnamese/English as they already are; agent/skill/command prompts are in English.

## Commands

Node ≥ 21, no dependencies to install.

| Task | Command |
|---|---|
| All tests (also runs `claude plugin validate --strict` if the `claude` CLI is on PATH) | `npm test` |
| One test file | `node --test tests/hooks.test.mjs` |
| One test by name | `node --test --test-name-pattern="<regex>" tests/<file>.test.mjs` |
| Validate manifests only | `npm run validate` |
| Try the working copy of the plugin | `claude --plugin-dir plugins/team`, then `/reload-plugins` after edits |
| Migrate an old `.team/` workspace | `node plugins/team/tools/team-state.mjs migrate <dir>/.team` (dry run; `--write`) |
| Migrate old IDs (`T-1`, `AC1`) | `node plugins/team/skills/run-kit/scripts/migrate-ids.mjs <project>` (dry run; `--write`, `--all`) |

CI (`.github/workflows/plugin.yml`) installs a pinned `@anthropic-ai/claude-code` and runs `npm test`.

## Architecture

```
plugins/team/
├── agents/      team-orchestrator (orchestrator) + 13 specialists (one role each)
├── commands/    run, triage, standup, retrospect + 7 pipelines (feature fix review test infra release new)
├── skills/      run-kit (orchestrator's reference, + scripts/migrate-ids.mjs) · specialist-rules (shared rules +
│                Handoff, preloaded by every specialist via `skills:`) · method
│                skills: business-analysis, plan,
│                development-process, test-process,
│                retrospect (+ scripts/retrospect.mjs, transcript miner)
├── workflows/   Workflow-tool scripts (plugin component dir, auto-registered by
│                name): build-loop, review, release, plan-tickets, compact
├── hooks/       hooks.json → guard.mjs (deterministic rule enforcement)
├── tools/       team-state.mjs (item JSON schema, STATE.md view, migrate) —
│                shared: hook, orchestrator, migrate-ids, tests
└── templates/   files the agents fill in the target project's .team/
```

How the pieces connect (each needs several files to see):

- **Orchestrator → pipeline → specialists.** A command (or `team-orchestrator` as main agent) classifies the request, picks a lane by **tier** (T0 `--small`, T1 default, T2 for new flows/contracts/auth/payments/migrations/data deletion) and spawns specialists. Orchestrator must run in the main session — subagents cannot spawn subagents.
- **State lives in the target project's `.team/items/<slug>.json`.** `STATE.md` is generated from it by `tools/team-state.mjs` (via the post-write hook); nobody hand-writes it. Resume = `/technical-team:run` with no args.
- **QA-Fix loop** is implemented in `workflows/build-loop.js` *and* described in `skills/run-kit/references/qa-loop.md` / `qa-lines.md` for inline runs. The brief lines must stay byte-identical between the script constants and `qa-lines.md` — `tests/build-loop.test.mjs` checks this. One `round` counter for review + qa, cap from `ROUND_CAP` in `team-state.mjs`.
- **Workflows fall back to inline.** Commands call workflows by name (`technical-team:team-build-loop`, …); without the Workflow tool the orchestrator runs the same steps inline from run-kit. Changing loop behaviour means updating both paths.
- **Hook = only the rules that need code.** `guard.mjs` applies only to `technical-team:team-*` specialists (never the orchestrator or user session): blocks `git commit`/`push` and rejects reports without a `### Handoff` (Status + Evidence); on a `.team/items/*.json` write (any session) it regenerates `STATE.md`. A guard error must exit 0 (never block work).
- **One home per rule.** Rules every pipeline shares (routing table, tiers, Workflow opt-in, task list, check-only close, no commit/push) live in run-kit §2 *Running a pipeline*; a command file holds only its own steps. Add a shared rule there, not to each command.
- **Agent colors** live only in agent frontmatter `color:` (mirrored in the run-kit roster, checked by test); no personas.
- **Agents declare no `tools` allowlist** so they inherit project MCP servers and skills; `disallowedTools` only removes what the role must not do (e.g. debugger has no `Edit`, ba, pm, architect and designer have no `Bash`).

## Document format

Every prompt file follows the skeleton of its type; `tests/structure.test.mjs` checks the headings. Write new content into the section it belongs to; do not add sections.

| Type | Skeleton |
|---|---|
| Agent (`agents/*.md`) | `# <Role>` · bold one-line mission · `## Inputs` · `## Before you start` · `## Work` (numbered steps, `→ verify:` where a step has a check) · `## Done when` · `## Stop and report` · `## Writes` · `## Never` |
| Command (`commands/*.md`) | `# /technical-team:<name>` · request + run-kit line · `## When to use` · `## Steps` (table `\| # \| Step \| Agent \| Gate / verify \|`) · `## Workflow` (only with a workflow) · `## Done when` |
| Method skill (`SKILL.md`) | `# <skill> — purpose` · `## When to load` · `## Principles` (each `### n. title` → bold rule → bullets → `Test:` line) · `## Method` · `## Done when` · `## References` (table) |
| Reference (`references/*.md`) | `# <title>` · `> Used by: <role> · Read when: <step>` · its sections |

The four working principles (Think before you work · Simplicity first · Surgical changes · Goal-driven, from forrestchang/andrej-karpathy-skills) live once in `skills/specialist-rules`; an agent states only what is specific to its role, in its own sections.

## Rules when changing the plugin

- **Still in development: remove outright.** Unused or unwanted pieces are deleted fully — no `deprecated`/`removed` entries in `tests/contract.json`, no Deprecated/Removed/Migration lines in `CHANGELOG.md`, no compat fallbacks. Drop the name from `tests/contract.json` and from the `V031_*` lists in `tests/contract.test.mjs` too. These two files still pin everything that remains (plugin id, command and agent names, `.team/` paths, handoff fields), so add new public names there.
- Adding/renaming/removing a command, agent, skill or template → update the lists in `tests/commands.test.mjs` and the tables in `README.md` (the test cross-checks README, the `.team/` layout and that every referenced file exists).
- A release bumps `version` in `plugins/team/.claude-plugin/plugin.json` and adds a `CHANGELOG.md` entry (Breaking / Deprecated / Removed / Migration when they apply).
- Keep prompts short: orchestrator context size per run is a tracked metric in the CHANGELOG; prefer moving detail into a skill reference loaded on demand over growing an agent or command file.
- Line endings: tests normalise CRLF, but keep files LF.
