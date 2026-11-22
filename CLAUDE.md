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
| Migrate old IDs (`T-1`, `AC1`) | `node plugins/team/tools/migrate-ids.mjs <project>` (dry run; `--write`, `--all`) |

CI (`.github/workflows/plugin.yml`) installs a pinned `@anthropic-ai/claude-code` and runs `npm test`.

## Architecture

```
plugins/team/
├── agents/      team-lead (orchestrator) + 12 specialists (one role each)
├── commands/    run, crew + 7 pipelines (feature fix review test infra release new)
├── skills/      run-kit (lead's reference) · specialist-rules (shared rules +
│                Handoff, preloaded by every specialist via `skills:`) · 4 method
│                skills: business-analysis, technical-planning,
│                development-process, test-process
├── workflows/   Workflow-tool scripts: build-loop, review, release,
│                plan-tickets, compact
├── hooks/       hooks.json → guard.mjs (deterministic rule enforcement)
├── tools/       team-state.mjs (item JSON schema, STATE.md view, migrate)
│                · migrate-ids.mjs
└── templates/   files the agents fill in the target project's .team/
```

How the pieces connect (each needs several files to see):

- **Lead → pipeline → specialists.** A command (or `team-lead` as main agent) classifies the request, picks a lane by **tier** (T0 `--small`, T1 default, T2 for new flows/contracts/auth/payments/migrations/data deletion) and spawns specialists. Lead must run in the main session — subagents cannot spawn subagents.
- **State lives in the target project's `.team/items/<slug>.json`.** `STATE.md` is generated from it by `tools/team-state.mjs` (via the post-write hook); nobody hand-writes it. Resume = `/technical-team:run` with no args.
- **QA-Fix loop** is implemented in `workflows/build-loop.js` *and* described in `skills/run-kit/references/qa-loop.md` / `qa-lines.md` for inline runs. The brief lines must stay byte-identical between the script constants and `qa-lines.md` — `tests/build-loop.test.mjs` checks this. One `round` counter for review + qa, cap from `ROUND_CAP` in `team-state.mjs`.
- **Workflows fall back to inline.** Commands call workflows by name (`technical-team:team-build-loop`, …); without the Workflow tool the lead runs the same steps inline from run-kit. Changing loop behaviour means updating both paths.
- **Rules are enforced by hook, not only prose.** `guard.mjs` applies only to `technical-team:team-*` specialists (never the lead or user session): blocks `git commit`/`push`, blocks writes to `.team/items/`, rejects reports without a `### Handoff` (Status + Evidence); on any `.team/**` write it validates item JSON and spec rules (no Revision/Round headings, lines ≤300 chars, ≤4,000 words). A guard error must exit 0 (never block work).
- **Personas** (emoji, name, vibe, badge colour) come from the target project's `.team/CREW.md` (template in `templates/core/CREW.md`); agent frontmatter keeps only `color:`.
- **Agents declare no `tools` allowlist** so they inherit project MCP servers and skills; `disallowedTools` only removes what the role must not do (e.g. debugger has no `Edit`, ba, pm, architect and designer have no `Bash`).

## Rules when changing the plugin

- **Public contract is frozen** in `tests/contract.json` (plugin id, command names, agent names, `.team/` paths, handoff fields). To rename/remove one: mark it `deprecated` (with `since`/`replacement`) or `removed` (with `since`) there **and** list it under Deprecated/Removed in `CHANGELOG.md`. Never edit the frozen `V031_*` lists in `tests/contract.test.mjs`.
- Adding/renaming/removing a command, agent, skill or template → update the lists in `tests/commands.test.mjs` and the tables in `README.md` (the test cross-checks README, the `.team/` layout and that every referenced file exists).
- A release bumps `version` in `plugins/team/.claude-plugin/plugin.json` and adds a `CHANGELOG.md` entry (Breaking / Deprecated / Removed / Migration when they apply).
- Keep prompts short: lead context size per run is a tracked metric in the CHANGELOG; prefer moving detail into a skill reference loaded on demand over growing an agent or command file.
- Line endings: tests normalise CRLF, but keep files LF.
