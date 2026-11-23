# Sources — the miner and what it can see

> Used by: retrospector · Read when: running the miner or reading a digest section

## The miner

`scripts/retro-miner.mjs` (Node ≥ 21, no dependencies) reads `~/.claude/projects/<project>/<session>.jsonl` (CLI and desktop write the same place), subagent runs under `<session>/subagents/agent-*.jsonl` and workflow runs under `subagents/workflows/wf_*/`. Read-only; no network; writes only `--out`.

| Flag | Use |
|---|---|
| `--days <n>` | window, 7–30 (default 14); outside → clamped, with a note |
| `--out <dir>` | `.team/retrospect/<YYYY-MM-DD>/evidence` → `digest.md` (read it) + `digest.json` (every item; open for a detail) |
| `--exclude-session <id>` | the current session (the brief gives it) |
| `--project <part>` / `--exclude-project <part>` | keep / drop project folders by name part (repeatable exclude: sandboxes, smoke tests) |
| `--plugin-root <dir>` | audit a working copy's definitions instead of the installed plugin |
| `--since <ISO>` / `--all-versions` | when the audited version started (default: its `plugin.json` write time) / keep every version — only to compare, never for the report |
| `--include-dev` / `--include-probes` | keep sessions in the plugin repo itself / tiny probe sessions (left out by default) |
| `--show <ref> --radius 4` | the entries around one ref, summarized and redacted: read it before citing the item |

Left out by default, with their counts in the digest header: sessions on an older plugin version (a cache path with another version, or a run with no released version that started before the audited one did), plugin development (`dev`: the cwd is the plugin repo, or the session edited `plugins/team/` source — the repo may be gone since), probes (run from a scratchpad folder, or under 50,000 cost-tokens with ≤1 agent run and no command), copies of a session under another project folder, prompts repeated by a fork or resume.

## Digest sections

| Section | Counts | Blind to |
|---|---|---|
| Follow-up metrics | prompts with the team %, corrections per agent run, long prompts, never-used components, skipped-step %, Handoff compliance %, invalid `Next:`, tool errors per run | anything outside the transcripts |
| Work inventory | every prompt of the work sessions (plugin or not) by keyword type, with or without a team piece in that turn | intent: "other" is large; open examples |
| Usage | typed commands, agent runs (subagent meta), workflows, skills loaded by the orchestrator or a specialist | `/run` routing (see workflows and agent runs) |
| Sub-agent health | per shipped agent: final `Status:` (Handoff, SubagentHandback or StructuredOutput), non-standard values, `Next:` naming no role, tool errors, denials | the quality of a `done` |
| Cost per specialist | cost-tokens, active seconds (gaps > 5 min dropped), tool calls | money; cost-tokens are relative |
| Signals | one heuristic each, with ≤3 refs and "showing N of M" | whether it is a defect: that is your call |

## Outside the transcripts

- `.team/` artifacts and git history: read them in the projects the digest's Sessions table names; a project folder that is gone → "no data".
- claude.ai chats are not on disk: "no data" unless the user exports them.
- The plugin version: from the cache path (`technical-team/<x.y.z>/`); a `--plugin-dir` run shows `dev` and counts when it started after the version start.
- The last retro: the latest other `<date>/evidence/digest.json` beside `--out`; its metrics are the Last column of Follow-up metrics. None → "first retro".
