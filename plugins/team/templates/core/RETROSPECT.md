# Retrospect — <YYYY-MM-DD>

> Owner: **the lead** (`/technical-team:retrospect`). One file per run in `.team/retrospect/`; never edited after the run. Facts come from the digest of `tools/retrospect.mjs`; every recommendation cites its refs (`<project>/<session>.jsonl:L<n>` under `~/.claude/projects`).
> Local only: refs and snippets come from your own transcripts. Do not commit this file or paste it outside without reading it first.
> **Budget:** ≤ 1,500 words; at most 8 recommendations; each field ≤ 40 words except Proposed change.

Window: <N> days (<from> → <to>) · plugin <version> · sessions <n> (scanned <n>, plugin-repo excluded <n>) · older plugin versions: <list or "none">

## Metrics

| Metric | Value |
|---|---|
| Specialist runs | <n> (top: <agent n, agent n>) |
| Cost-tokens, top agent | <agent: share %, avg> |
| Lead context max | <tokens> (session <ref>) |
| Guard firings | <rule n, rule n, or "none"> |
| Handoffs blocked / needs-input / missing | <n / n / n> |
| Compactions · interrupts | <n · n> |

## Recommendations

### R1 · <component path, e.g. agents/team-qa.md> · <add / remove / merge / edit>
- Problem: <what goes wrong, in one sentence>
- Evidence: <signal id> — `<ref>`, `<ref>` (≥ 2 refs from ≥ 2 sessions, or 1 ref plus a metric)
- Proposed change: <file — the current line or section → the new text; for add: the new file's purpose and frontmatter>
- Impact / risk: <what it saves or fixes; what it may break; lead context size change>
- Contract: <none, or: deprecate in tests/contract.json + CHANGELOG Deprecated>
- Confidence: <high / medium / low>

## Hypotheses

- <a pattern with too little evidence to act on — what data would confirm it>

## Not covered

- <signals set aside and why: older plugin version, environment (API limits), outside the plugin>
