# Retrospect — <plugin> <version> — <window>

> Owner: **team-retrospector** (`/technical-team:retrospect`, skill `technical-team:retrospect`), as the AI agent engineer who makes the plugin better each version. Folder `.team/retrospect/<YYYY-MM-DD>/`: this file, `changes.md` (exact diffs for update and delete), `drafts/<agents|skills|commands>/<name>.md` (the full file for new and update), `evidence/` (the digest; gitignored). Never edited after the run.
> **Paste-ready:** ≤ 600 words without the Evidence list, ≤ 5 proposals, each frame heading ≤ 3 lines; in the user's language (headings too); no sections beyond these. A fact starts with "Data shows", a guess with "Inference". Refs as `[E<n>]`, resolved in full under Evidence.
> A proposal sits in the group of the file it changes; a hook, workflow, template or miner change goes with the agent, skill or command that owns it.

Sample: <n> plugin sessions on <version> (since <date>) of <m> work sessions · excluded: older versions <n>, plugin dev <n>, probes <n> · confidence: <high / medium / low — why in ≤ 8 words>

## Verdict

- <≤ 3 bullets: what is working, what is not, the one decision to make>

## Agents

### A1 · <new | update | delete> `agents/<name>.md` · signal `<digest id or audit>` · confidence <high / medium / low>

#### Why <new | update | delete>?
<the problem the team hits now, with [E1] [E2]>

#### Improves which part?
<which component and which team behaviour get better>

#### Workflow
<after the change: who does what, in which order, with what in and out — one line per step>

#### Committed improvement
<metric from the digest's Follow-up metrics (or a signal's count): now <n> → target <n>, re-measured at the next retro>

Draft: `drafts/agents/<name>.md` · Diff: `changes.md#a1` · Contract: <none, or the `tests/contract.json` entry and README table a delete or rename touches>

## Skills

none

## Commands

none

## Since the last retro

| Metric | <last version> | <this version> | Δ |
|---|---|---|---|

- Last retro's proposals: <A1 applied → <metric> moved <Δ> · C1 not applied · "first retro" when none>

## Not acted on

- <one line each: `signal id` — noise or a hypothesis — why>

## Evidence

- [E1] `<project>/<session>.jsonl:L<n>` — <≤ 8 words>
