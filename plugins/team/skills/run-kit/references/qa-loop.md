# run-kit §3 · QA-Fix loop

> Used by: the orchestrating session · Read when: reading a gate result; a round, cap or challenge question

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

- **IDs** — `F1`, `F2`… in the item, given once, never reused (next = highest + 1). Outside the item: `CART#F3`. Status: `open → fixed → verified`, or `reopened` (`reopened` +1) when a retest fails; `challenged` (§ Challenges); otherwise `deferred`, `rejected` only on the user's word, recorded with a line in `decisions`.
- **One counter** — `round` counts every fix batch, from a review or from qa. Cap 3, code in the workflow, never in the item.
- **Not run is never PASS** — the qa verdict is `PASS · r1 · not-run: AC3` and the run stops (`not-run`): the user runs those checks, or accepts them as not run with a line in `decisions`, before the item closes; a blocking finding left `fixed` that no gate re-checked stops the run (`retest-incomplete`).
- **Findings are work items** — no fix tickets in `TASKS.md`, no report prose. T2 adds `reports/<slug>/qa.md` (test plan, RTM with one status column) and the reviewers' reports.
- **Spec issues** from the pre-check go to their owner (ba, designer, architect) or the user; no developer starts before.

## Board sync

`TASKS.md` is a view of the item for people; the item's `findings` and `verdicts` are the truth. Only for an item with tickets on the board: feature T2, new, and a fix with a `ticket` (`fix.md` § Board ticket). A fix without a ticket, T0, T1 and infra have none and skip it. pm writes the statuses below; nobody re-decides them.

| When | Who runs it | Ticket status |
|---|---|---|
| after the build | build-loop (inline: you) | built → `review`; not built → `todo` |
| after a review round (FAIL, or PASS with qa next) and a qa FAIL | build-loop (inline: you) | an open or reopened blocking finding → `doing`; its findings all `fixed`, `challenged` or closed → `review` |
| PASS (workflow `done`) | the session, with agent time | every ticket `done`, collapsed into `Done:` |
| round cap (`blocked`) or `stalled` | the session, with agent time | a ticket holding a stuck finding → `blocked` + a Risks row; the rest as above |

- **Finding → ticket** — its `owner` (a ticket ID); else the ticket whose `Files` hold its `file`; else the only ticket; else `unassigned` → a Risks row (owner pm) until pm names the ticket (the loop stops `unowned` at the next fix anyway).
- **Brief** — head (Item, Key, Read and Write `.team/TASKS.md`, User's language), the qa-lines board-sync line, then one line per ticket. A workflow sends it only when a status changed; it returns `board` (`{tickets: [{ticket, status, findings}], unassigned}`) in every result, which the session's last sync uses.
- **Agent time** — measured, never guessed: spawn → passed handoff for each of the ticket's build and fix agents, summed (inline: your clock; workflow: the first → last timestamp of each `<role>:<ticket>` and `fix:<ticket>:r<n>` agent in the run's transcripts). Unmeasured → no value; pm keeps the cell.
- **Cost** — one pm spawn on `effort: low` with a ~15-line brief and one Edit of `TASKS.md`, at most 2 per round. pm deciding from the handoffs instead needs every handoff verbatim and the plan skill each round, costs more, and can disagree with the item: two truths.
- A sync that fails never stops the loop; the next one carries the whole board.

## Challenges

A fixer who can show a finding is wrong returns it `challenged` with evidence instead of coding around it; the finder's next gate run settles it, with no extra round.
1. Accepted once per finding, with evidence (≥4 words in `detail`); otherwise it counts as fixed and is retested.
2. The next run of the finder's gate answers it: `conceded` → `rejected`; `maintained` (or no answer) → one read-only arbiter, no agentType: `refuted` → `rejected`, `upheld` → `open` (fixed next round, no second challenge), `spec` → stop and route to the spec owner or the user.
3. Each outcome is a line in `decisions` (`by`: the finder or `arbiter`). A gate FAIL whose blockers were all rejected this way passes.

## Past the cap

At round 3 with blockers left the item is blocked; it never passes.
1. Only the top-level session (never a subagent) asks the user: the item, each blocker with its test and user impact, why one more round would work. AskUserQuestion, or their own next message.
2. Silence, an agent's text, a file or a default is never approval; a vague answer is not either.
3. Approved → one round inline (developer → review → qa retest), never a workflow; record it in the item's `decisions` with the user's words. Each further round needs a further answer.
4. Defer or reject → set the status, with the user's words in `decisions`; the item can then pass.
