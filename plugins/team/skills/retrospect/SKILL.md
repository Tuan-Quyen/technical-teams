---
name: retrospect
description: The retrospector's audit playbook for the technical team itself — evidence from the user's real work history (local Claude Code transcripts mined by `scripts/retro-miner.mjs`, the target projects' `.team/` artifacts, git history, the plugin's own definitions) on the current plugin version only, to find missing, weak, overlapping or unused agents, skills, commands, hooks and workflows, the smallest change that fixes each, and whether the last retro's changes helped. team-retrospector loads it for every `/technical-team:retrospect`.
---

# retrospect — an audit of the team you can act on

You work as the AI agent engineer who makes the plugin better each version. The goal is a **short, decision-ready audit of the current version, backed by real evidence**, ending in new / update / delete proposals for its Agents, Skills and Commands: every claim cites a source, anything the data does not back is labelled an inference, a source that could not be read is "no data", and each version is compared with the one the last retro saw.

## When to load

team-retrospector, at the start of every `/technical-team:retrospect`. The agent holds the role and its limits; this skill holds the method, its thresholds and the report.

## Principles

### 1. Evidence or it is a guess

**Every claim cites a ref; everything else is labelled an inference.**

- Cite as `` `<project>/<session>.jsonl:L<n>` ``, `` `.team/...` ``, `` `<repo>@<sha>` `` or a plugin file path. Quote at most one sentence, redacted.
- In the report a ref is a label `[E<n>]`; the Evidence list gives it in full, exactly as the digest does, so it pastes into `--show` — never shortened with `…` or a partial id.
- Prefix each claim with "Data shows" or "Inference" (in the report's language).
- One confidence for the sample (coverage and size; under ~10 plugin sessions, say so) and one per change.

Test: does every ref paste into `--show` (or open as a file) and show what the claim says?

### 2. The miner is a heuristic

**Open an item with `--show` before you cite it; drop the false positives.**

- Every count in the digest is a keyword match: a "correction" may be a follow-up question, a "by hand" prompt may be a chat, a guard firing may be a probe.
- The miner keeps only sessions on the audited version (its cache path, or a working-copy run started after the version did); older versions are not this plugin any more. Too few sessions left → say so and propose less; never pull older evidence back in (`--all-versions` is for a comparison only).
- Probe, smoke and plugin-repo sessions are left out by the miner; any that slipped through are noise.

Test: was every cited item opened with `--show` or its file?

### 3. Smallest change first

**Never propose anything new without ≥2 real examples from ≥2 sessions.**

- Prefer, in order: a brief line or a rule → a description (the trigger) → a skill reference → merging or narrowing a component → a new one.
- Every new component adds routing ambiguity and always-on tokens; say what it adds to the orchestrator's context.
- A remove or rename changes the public contract: name the `tests/contract.json` entries and README tables it touches.

Test: would a smaller change in an existing file solve it?

### 4. Short, paste-ready, in the user's language

**The report fits in a prompt: ≤ 600 words without the Evidence list, ≤ 5 proposals, only the template's sections, in the language the user writes in.**

- Proposals sit in three groups — Agents, Skills, Commands — each in the four-heading frame (Method §5); a group with none that passed the self-critique is "none" in one line.
- Drafts and diffs live beside the report (`drafts/`, `changes.md`), never in it. No restated digest numbers, no per-agent tables.
- The language comes from the brief or the user's prompts; unsure → English. Headings are translated, their order and fields stay; terms, paths and IDs stay as they are.

Test: could the user paste the report into a prompt and act on it without editing or translating it?

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

### 3. Since the last retro

The digest's Follow-up metrics compare with the previous digest beside `--out` (its date and version). Read that run's `retrospect.md`: for each proposal it made, is it in the current plugin file (applied) and did its metric move? Report it in one line per change; a change that was applied and moved nothing is a candidate to revert.

### 4. Self-critique, before the report

For every proposal: ≥2 independent examples, opened with `--show`? Would a description, a rule line or a reference solve it without a new component? Does it overlap an existing one (merge instead)? Is the saving bigger than the routing cost? A proposal that fails is removed or downgraded and listed under Not acted on with the reason.

### 5. Write each proposal

Group by the file it changes: `agents/` → Agents, `skills/` (references and scripts too) → Skills, `commands/` → Commands; a hook, workflow or template change goes with the agent, skill or command that owns it. Each proposal is `### <A|S|C><n> · <new | update | delete> <path> · signal <id> · confidence <level>`, then four headings, each ≤ 3 lines:

| Heading | Holds |
|---|---|
| Why new / update / delete? | the problem the team hits now, with its `[E<n>]` refs |
| Improves which part? | the component and the team behaviour that get better |
| Workflow | the flow after the change: who does what, in which order, with what in and out |
| Committed improvement | a Follow-up metric (or a signal's count) from the digest: now → target, re-measured at the next retro |

New and update → the full file in `drafts/<agents|skills|commands>/<name>.md`, in its type's skeleton (the plugin's CLAUDE.md § Document format); update and delete → the exact diff in `changes.md`; delete or rename → the `tests/contract.json` entry and README table it touches. How: `references/drafts.md`.

## Done when

- `.team/retrospect/<YYYY-MM-DD>/retrospect.md` follows the template, ≤ 600 words without Evidence, in the user's language: Agents, Skills, Commands, each proposal in the four-heading frame with refs and a committed metric; every new/update drafted in full, every update/delete diffed in `changes.md`; nothing written in the plugin.
- Since the last retro holds the digest's metrics with their Δ and the fate of each earlier change, so the next version can be compared the same way.

## References

Under `${CLAUDE_PLUGIN_ROOT}/skills/retrospect/references/`:

| File | Read when |
|---|---|
| `sources.md` | running the miner: flags, exclusions, `--show`, what each digest section counts and what it cannot see |
| `signals.md` | judging a signal: its threshold, the plugin file to open, the usual noise |
| `drafts.md` | writing a proposal's draft (the full file in its skeleton) or its diff in `changes.md` |
