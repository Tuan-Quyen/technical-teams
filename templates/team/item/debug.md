Verdict: FAIL · Round 1

# W-000 — <title> · diagnosis

> Owner: **team-debugger** (only the debugger writes this file; everyone reads it). Path: `.team/reports/W-000-<kebab-title>/debug.md`.
> Line 1 is the verdict of the latest round: `Verdict: PASS | FAIL · Round N`. PASS = the root cause is proven with evidence; FAIL = not reproduced or not proven yet.
> The causes table is cumulative: an ID (`D-01`, `D-02`…) is never reused or renumbered. A cause has no status of its own: whether its fix holds is tracked by the qa finding or ticket named in "Tracked as". The Round detail section holds the latest round only: replace it every round.

## Causes
| ID | Root cause (one sentence) | Where | Risk | Tracked as |
|---|---|---|---|---|
| D-01 | <cause, not where it surfaces> | `src/x.ts:42` | low / high | Q-01 in `.team/qa/W-000-<kebab-title>.md` |

## Round detail (latest round only)
- **Round:** R<n> · <date>
- **Symptom:** <as reported>
- **Repro:** <exact command + output, or what was tried>
- **Evidence:** <file:line, log lines, git history>
- **Fix direction:** <precise enough that the developer need not re-diagnose; hotfix: smallest safe fix + fallback>
- **Regression test idea:** <for qa>
- **Information still needed:** <only when not reproduced>
