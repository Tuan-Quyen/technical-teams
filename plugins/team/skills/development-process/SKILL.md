---
name: development-process
description: The developer's method for a ticket or fix: understand before coding, the codebase's own patterns, contracts on both sides, unit/component tests, the self-check and evidence before handoff, scoped fix rounds, when to stop blocked. developer loads it for a non-trivial ticket or fix.
---

# development-process — the ACs hold, and the evidence proves it

Done = the ticket's ACs hold in the codebase's own style, your tests prove each one, and build, lint and the related suites pass on your machine — before review or qa sees it. Review checks your work; qa checks the product; neither replaces your self-check.

## When to load

developer, for a non-trivial ticket or fix: several files, a contract, a fix round, or a debugger's root cause to act on. `team-developer` holds the everyday rules.

## Principles

### 1. Understand before coding

**List the conditions you must make true before you type.**

- The ticket, its ACs, the RTM rows qa mapped to it, the design or debug report, and the code you will touch.
- The design or an AC looks wrong or contradicts the code → `blocked` with evidence, to architect (design) or ba (AC): a workaround hides the problem from review.

Test: can you name every condition your change must satisfy?

### 2. The smallest change in the existing pattern

**Copy how the codebase already does it.**

- A new pattern, dependency or abstraction needs a reason you can state in one line (`references/implementation.md`).

Test: would the change look native to a reader of the neighbouring code?

### 3. Only the ticket's files

**Ticket ownership keeps parallel work safe.**

- Only the ticket's `Files`; needing another file → `needs-input`, naming it.
- A contract the design pinned → only your side; an unplanned contract change → `needs-input` unless both sides are in your `Files`.
- A fix round's scope is the brief's finding IDs (`F3`); a new defect you notice → name it in the Handoff, do not fix it unasked.
- Integration, E2E and acceptance tests are qa's: flag a gap as a finding, do not write them (run-kit `roles.md`).

Test: does every changed file appear in the ticket?

### 4. Evidence, not claims

**Real output proves done; "should pass" does not.**

- Build, lint and the related suites pass now, on this tree. The environment prevents a run → `blocked` with the exact error.

Test: does every claim in the Handoff quote a command's output?

## Method

### Per ticket

| Step | Do | Output |
|---|---|---|
| 1. Understand | read the ticket, its ACs, the RTM rows qa mapped to it (`.team/reports/<slug>/qa.md`, when the brief names it), the system design or debug report, and the code you will touch | the conditions you must make true, listed |
| 2. Plan | smallest change that fits the existing pattern; name the files | a 3–5 line plan in your head or reply, not a file |
| 3. Test first where it is cheap | a failing unit test for each AC condition and each bug ID before the fix | red tests that name the condition |
| 4. Implement | make them pass; handle the states (empty, error, slow, concurrent, no permission, partial data) | code + green tests |
| 5. Self-check | build · lint · the related suites · a basic smoke run of the changed path; walk the RTM conditions one by one | real summary lines |
| 6. Clean up | remove debug output, dead code, stray files; format only your files | a diff a reviewer can read |
| 7. Handoff | evidence + RTM self-check + known limits (`references/evidence-and-fixes.md`) | `done`, or `blocked` with the error |

### Fix rounds

- Each finding's failing test must pass; add a regression test at your level (unit/component) when it has none. qa's integration/E2E regression test, when the pre-check wrote one, must pass unchanged.
- Keep the IDs: refer to `F3` in the Handoff, never renumber it.
- A finding reopened → read the gate's evidence again before touching code; reopened twice is a design problem → `blocked`.

### Stop instead of pushing on

| Situation | Status | Why |
|---|---|---|
| the design or an AC looks wrong or contradicts the code | `blocked`, to architect or ba, with evidence | a workaround hides the problem from review |
| two attempts at the same failure did not fix it | `blocked`, with both attempts and their output | a third guess costs more than a debugger |
| the environment prevents build, tests or smoke | `blocked`, with the exact error | "done" without a run is not done |
| the fix needs files outside the ticket | `needs-input`, naming the files | ticket ownership keeps parallel work safe |
| a user decision is needed (behaviour, data, cost) | `needs-input`, with options and a recommended default | the decision is the user's |

## Done when

All true, or the Handoff says which is not:

- Every AC and every RTM condition of the ticket → a test or a named check, and it passes.
- Tests added for new behaviour; changed tests say why; no test skipped, deleted or weakened.
- Build, lint and related suites pass now, on this tree.
- Only the ticket's files changed.
- Errors are handled where they happen; nothing swallowed; no secret, debug print or TODO without a ticket.
- A contract change the design did not split across tickets has both sides and their tests.

## References

Under `${CLAUDE_PLUGIN_ROOT}/skills/development-process/references/`:

| File | Read when |
|---|---|
| `implementation.md` | shaping the change (patterns, contracts, states, errors, refactoring, dependencies) and writing its unit/component tests (cases, doubles, flaky tests) |
| `evidence-and-fixes.md` | writing the Handoff evidence and RTM self-check; a fix round from finding IDs; a fix from a debug report |
