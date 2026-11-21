---
name: development-process
description: The developer's working method for a ticket or a fix — understand before coding (ticket, ACs, the RTM conditions qa mapped, design or debug report), change design in the codebase's own patterns, contracts changed on both sides at once, the states a change must handle, unit/component tests the developer owns (happy, negative, boundary, error paths; test doubles; no weakened or skipped test), the self-check before handoff (build, lint, related suites, smoke), the evidence and RTM self-check the Handoff carries, fix rounds scoped to the listed bug IDs with a regression test per fix, and when to stop blocked instead of hacking. developer loads it for a non-trivial ticket or fix.
---

# development-process — the ACs hold, and the evidence proves it

Done = the ticket's ACs hold in the codebase's own style, your tests prove each one, and build, lint and the related suites pass on your machine — before review or qa sees it. Review checks your work; qa checks the product; neither replaces your self-check.

Read on demand (paths under `${CLAUDE_PLUGIN_ROOT}/skills/development-process/references/`):

| File | When |
|---|---|
| `implementation.md` | shaping the change: reading the code first, fitting its patterns, contracts, the states checklist, error handling, refactoring safely, dependencies |
| `unit-testing.md` | writing the unit/component tests: what to cover, test design at unit level, test doubles, flaky tests, what never to do to a test |
| `evidence-and-fixes.md` | writing the Handoff evidence and RTM self-check; working a fix round from bug IDs; a fix from a debug report |

## Per ticket

| Step | Do | Output |
|---|---|---|
| 1. Understand | read the ticket, its ACs, the RTM rows qa mapped to it (`.team/reports/<slug>/qa.md`, when the brief names it), the system design or debug report, and the code you will touch | the conditions you must make true, listed |
| 2. Plan | smallest change that fits the existing pattern; name the files (only the ticket's `Files`); a contract the design pinned → only your side; an unplanned contract change → `needs-input` unless both sides are in your `Files` | a 3–5 line plan in your head or reply, not a file |
| 3. Test first where it is cheap | a failing unit test for each AC condition and each bug ID before the fix | red tests that name the condition |
| 4. Implement | make them pass; handle the states (empty, error, slow, concurrent, no permission, partial data) | code + green tests |
| 5. Self-check | build · lint · the related suites · a basic smoke run of the changed path; walk the RTM conditions one by one | real summary lines |
| 6. Clean up | remove debug output, dead code, stray files; format only your files | a diff a reviewer can read |
| 7. Handoff | evidence + RTM self-check + known limits (`evidence-and-fixes.md`) | `done`, or `blocked` with the error |

## Definition of done (all true, or the Handoff says which is not)

- Every AC and every RTM condition of the ticket → a test or a named check, and it passes.
- Tests added for new behaviour; changed tests say why; no test skipped, deleted or weakened.
- Build, lint and related suites pass now, on this tree — not "should pass".
- Only the ticket's files changed; needing another file is a `needs-input`, not a silent extra.
- Errors are handled where they happen; nothing swallowed; no secret, debug print or TODO without a ticket.
- A contract change the design did not split across tickets has both sides and their tests.

## Fix rounds

- The brief's bug IDs (`CART-B3`) are the whole scope: fix those, nothing else. A new defect you notice → name it in the Handoff, do not fix it unasked.
- Each fix gets a regression test at your level (unit/component) that fails before and passes after; qa's integration/E2E regression test, when the pre-check wrote one, must pass too.
- Keep the IDs: refer to `CART-B3` in the Handoff, never renumber or rename it.
- Same bug back a second time → read qa's evidence again before touching code; a third attempt is a design problem → `blocked`.

## Stop instead of pushing on

| Situation | Status | Why |
|---|---|---|
| the design or an AC looks wrong or contradicts the code | `blocked`, to architect (design) or ba (AC), with evidence | a workaround hides the problem from review |
| two attempts at the same failure did not fix it | `blocked`, with both attempts and their output | a third guess costs more than a debugger |
| the environment prevents build, tests or smoke | `blocked`, with the exact error | "done" without a run is not done |
| the fix needs files outside the ticket | `needs-input`, naming the files | ticket ownership keeps parallel work safe |
| a user decision is needed (behaviour, data, cost) | `needs-input`, with options and a recommended default | the decision is the user's |

## Never

- Claim a QA PASS, or say qa is not needed: the product verdict is qa's.
- Write integration, E2E or acceptance tests that qa owns; flag a gap as a finding instead.
- Run anything against production or a shared database; commit or push.
