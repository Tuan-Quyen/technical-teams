---
description: "Show the team's current state as a pipeline view per work item, from .team/STATE.md, .team/TASKS.md and the verdict lines of the open items' reports — what waits for you, gates, squads, blocked tickets"
disable-model-invocation: true
---
# /technical-team:status — current state

Run this yourself; do not delegate. Read-only: no agents, no file changes.

1. No `.team/STATE.md` → say there is no team work yet and any command starts it. Stop.
2. Read `.team/STATE.md`, `.team/TASKS.md`, `.team/ROSTER.md`, and for each open item only line 1 (`Verdict: …`) of `.team/qa/<slug>.md` and of the files in `.team/reports/<slug>/`; skip missing files. Never read `.team/archive/`.
3. Output, in the user's language:
   1. **Waiting for you**: every pending gate or decision with its work-item ID, or `nothing`.
   2. One pipeline view per open work item, newest first (below).
   3. Follow-ups: count of `todo` rows under `## Follow-ups` in `TASKS.md`; omit when zero.
   4. Specialists: one line with the count.
   5. Next command per item (answer the gate, `new` to resume, `feature` to continue, `fix` for a bug…).

## Pipeline view

A fenced text block per work item, at most 80 columns:

```
W-012  Offline sync            feature (full) / T2      running
────────────────────────────────────────────────────────────────
Discovery  ba ✓  designer ✓  architect ✓  pm ✓  qa-plan ✓
  ▣ G1 approved 2026-11-10
Build      developer ●  dba ✓                    tickets 3/5
  ✗ W-012-T4 blocked (developer): <note>
Verify     code-reviewer ✗ R2  qa ○  security ✓ R1
  ▢ G2   ▢ G3
────────────────────────────────────────────────────────────────
⚠ Waiting for you: nothing
↻ Loop: round 2 — round 1 FAIL (D1, D3) → fixed · escalation: none
⏸ Deferred: 1 — <finding> (<owner>)
```

- Header: ID, title, pipeline (mode) / tier, status from `STATE.md`.
- Squad rows Discovery → Build → Verify; support roles join the row where they acted. A squad not reached is `○ not reached`.
- Marks: `✓` done, `●` working now (a `doing` ticket / `Next step` naming the role; this is the last recorded step, not a live signal), `✗` failed or blocked, `○` not reached. Show a role only when a source names it; never guess.
- Verify row: from the verdict lines — `✓ R<n>` for `PASS · Round n`, `✗ R<n>` for `FAIL`, `○` when the file does not exist or says `PENDING`.
- Gates: `▣` passed (with date), `▢` pending, under the squad they close.
- Tickets `done/total` on the Build row; each blocked ticket on its own `✗` line.
- `↻` loop line from `Loop log` (flag `stalled` when the same failure repeats), `⏸` deferred findings; omit when empty.

## New-project runs (pipeline `new`)

Replace the squad header with the phase strip and show squads for the current milestone only:

```
W-001  Shop app                new                      running
────────────────────────────────────────────────────────────────
N0 ✓  N1 ✓  N2 ✓  N3 ✓  N4 ● M2/4  N5 ○  N6 ○  N7 ○
Milestones  M1 Catalog ✓ 2026-11-02 · M2 Cart ● · M3 Checkout ○
  ▣ REQ  ▣ STACK  ▣ G1  ▣ M1  ▢ M2  ▢ RELEASE
Build      developer ●                           tickets 2/6
Verify     ○ not reached
────────────────────────────────────────────────────────────────
⚠ Waiting for you: nothing
→ Next step: feature.md D3 on M2 tickets (round 2)
```

Phase, milestones, gates and next step come from `STATE.md`; tickets from the current `### M<k>` group in `TASKS.md`.
