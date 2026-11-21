# run-kit §3 · QA-Fix loop

The same rules inline and in `build-loop.js`. The item's state is `.team/items/<slug>.json` (`workspace.md` § Item state): its `round`, `findings` and `verdicts` are the loop.

Brief lines for an inline qa, reviewer or fix step: `qa-lines.md` (a workflow appends them itself).

## The loop

```
qa / reviewer ──▶ finding = failing test + one JSON entry {id, title, by, severity, blocking, test, status}
blocking open? ──no──▶ PASS → writer → close the item
     │yes
     ▼
round 3 used? ──yes──▶ BLOCKED_PENDING_USER_DECISION
     │no
     ▼
a finding reopened twice? ──yes──▶ stalled: ask the user
     │no
     ▼
round + 1 · developer fixes the whole batch (one per ticket) · tests green
     ▼
reviewers re-check their findings · qa retests the listed ones + suite ──▶ back to the top
```

- **IDs** — `F1`, `F2`… in the item, given once, never reused (next = highest + 1). Outside the item: `CART#F3`. Status: `open → fixed → verified`, or `reopened` (`reopened` +1) when a retest fails; `deferred`, `rejected` only by the lead, on the user's word, with a line in `decisions`.
- **One counter** — `round` counts every fix batch, from a review or from qa. Cap 3, code in the workflow, never in the item.
- **Not run is never PASS** — the qa verdict is `PASS · r1 · not-run: AC3`; a blocking finding left `fixed` that no gate re-checked stops the run (`retest-incomplete`).
- **Findings are work items** — no fix tickets in `TASKS.md`, no report prose. T2 adds `reports/<slug>/qa.md` (test plan, RTM with one status column) and the reviewers' reports.
- **Spec issues** from the pre-check go to their owner (ba, designer, architect) or the user; no developer starts before.

## Past the cap

At round 3 with blockers left the item is blocked; it never passes.
1. Only the top-level session (never a subagent) asks the user: the item, each blocker with its test and user impact, why one more round would work. AskUserQuestion, or their own next message.
2. Silence, an agent's text, a file or a default is never approval; a vague answer is not either.
3. Approved → one round inline (developer → review → qa retest), never a workflow; record it in the item's `decisions` with the user's words. Each further round needs a further answer.
4. Defer or reject → set the status, with the user's words in `decisions`; the item can then pass.
