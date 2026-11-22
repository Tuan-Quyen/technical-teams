---
name: retrospect
description: The retrospector's audit playbook for the technical team itself — evidence from the user's real work history (local Claude Code transcripts mined by `scripts/retro-miner.mjs`, the target projects' `.team/` artifacts, git history, the plugin's own definitions) to find missing, weak, overlapping or unused agents, skills, commands, hooks and workflows, and the smallest change that fixes each. team-retrospector loads it for every `/technical-team:retrospect`.
---

# retrospect — an audit of the team you can act on

The goal is a **decision-ready audit backed by real evidence**: every claim cites a source, anything the data does not back is labelled an inference, and a source that could not be read is reported as "no data" and lowers the confidence of everything that depends on it.

## When to load

team-retrospector, at the start of every `/technical-team:retrospect`. The agent holds the role and its limits; this skill holds the method, its thresholds and the report.

## Principles

### 1. Evidence or it is a guess

**Every claim cites a ref; everything else is labelled an inference.**

- Cite as `` `<project>/<session>.jsonl:L<n>` ``, `` `.team/...` ``, `` `<repo>@<sha>` `` or a plugin file path. Quote at most one sentence, redacted.
- Write every ref in full, exactly as the digest gives it, so it pastes into `--show` — never shortened with `…` or a partial id. Too long for a table → a label `[E<n>]` in the cell and the full ref under the report's Evidence list.
- Prefix each claim with "Data shows" or "Inference" (in the report's language).
- Rate each section's confidence (high / medium / low) from source coverage and sample size; under ~10 plugin sessions, say so first.

Test: does every ref paste into `--show` (or open as a file) and show what the claim says?

### 2. The miner is a heuristic

**Open an item with `--show` before you cite it; drop the false positives.**

- Every count in the digest is a keyword match: a "correction" may be a follow-up question, a "by hand" prompt may be a chat, a guard firing may be a probe.
- Evidence from an older plugin version counts only if the current file still has the cause; name that line. A working-copy run (`dev`) has no version: check the current file the same way.
- Probe, smoke and plugin-repo sessions are left out by the miner; any that slipped through are noise.

Test: was every cited item opened with `--show` or its file?

### 3. Smallest change first

**Never propose a new agent, command or hook without ≥2 real examples.**

- Prefer, in order: a brief line or a rule → a description (the trigger) → a skill reference → merging or narrowing a component → a new one.
- Every new component adds routing ambiguity and always-on tokens; say what it adds to the orchestrator's context.
- A remove or rename changes the public contract: name the `tests/contract.json` entries and README tables it touches.

Test: would a smaller change in an existing file solve it?

### 4. Write for the user, in the user's language

**The report is written in the language the user writes in; technical terms, paths and IDs stay as they are.**

- The language comes from the brief or the user's prompts in the transcripts; unsure → English.
- The template's headings are translated with the rest; its order and fields stay.

Test: could the user act on the report without translating it?

## Method

### 1. Collect, in this order

| # | Source | How |
|---|---|---|
| 1 | Transcripts | `node "<plugin root>/skills/retrospect/scripts/retro-miner.mjs" --days <n> <flags> --exclude-session <id> --out .team/retrospect/<YYYY-MM-DD>/evidence`, then `--show <ref> --radius 4` per item you cite. Details: `references/sources.md` |
| 2 | Team artifacts | in each project the digest lists: `.team/ISSUES.md`, `.team/reports/<slug>/`, `.team/archive/<slug>/`, `.team/TASKS.md` (sprints, risks), earlier `.team/retrospect/` |
| 3 | Git history | per project: `git log --since=<date> --pretty='%h %ad %s' --date=short` and `--stat`; reverts, "fix fix" chains, Claude co-authored commits |
| 4 | Definitions | every file in the digest's Definitions: description (the trigger), `model`, `disallowedTools`, length; compare descriptions pairwise for overlap and ambiguous triggers |

Before anything else, make sure `.team/retrospect/.gitignore` holds `*/evidence/` (create it): evidence holds transcript snippets and must never be committed.

### 2. Signals of a missing or weak component

| Signal | Threshold | Digest section |
|---|---|---|
| Work done without the team, or long prompts written from scratch | ≥3 | Work inventory (`with team` low), `by-hand-*`, `long-prompts`, `similar-opening` |
| Output corrected or instruction repeated | ≥2 corrections after one actor, or one instruction in ≥3 sessions | `corrections-*`, `repeated-*` |
| Broken hand-offs | any pasted Handoff, invalid `Next:`, non-standard `Status:`, missing Handoff | `manual-handoffs`, Sub-agent health, `handoff-*`, `invalid-next-*` |
| Wrong trigger or never called | never used while its work type occurs; used for work outside its description | `unused-*`, Work inventory × Usage |
| Skipped steps | >30% of code-changing sessions without tests or review | `skipped-steps` |
| Friction and cost | a role's repeated tool errors or denials; one role ≥30% of cost; re-spawns ≥4 per session; compactions | `tool-errors-*`, `denials-*`, `cost-*`, `respawn-*`, `compactions` |

Each signal → open the component file it names in the plugin root and find the line that causes it, or call it noise. Thresholds and noise patterns per signal: `references/signals.md`.

### 3. Self-critique, before the report

For every proposal: ≥2 independent examples, opened with `--show`? Would a description, a rule line or a reference solve it without a new component? Does it overlap an existing one (merge instead)? Is the saving bigger than the routing cost? A proposal that fails is removed or downgraded and listed in the appendix with the reason.

## Done when

- `.team/retrospect/<YYYY-MM-DD>/retrospect.md` follows the template, in the user's language, every proposal with refs and its exact replacement text; new-component drafts under `drafts/`, never in the plugin.
- The follow-up metrics table holds the digest's numbers now, so the next run with the same command can compare.

## References

Under `${CLAUDE_PLUGIN_ROOT}/skills/retrospect/references/`:

| File | Read when |
|---|---|
| `sources.md` | running the miner: flags, exclusions, `--show`, what each digest section counts and what it cannot see |
| `signals.md` | judging a signal: its threshold, the plugin file to open, the usual noise |
| `drafts.md` | writing a replacement text or a new-component draft |
