# Implementation — shaping the change and its tests

> Used by: developer · Read when: shaping a non-trivial change and its unit/component tests

## Read the code first

- Open the ticket's files and their callers; copy how the neighbouring code does the same thing (naming, layering, errors, logging, config, tests). A new pattern needs a reason you can state in one line.
- The system design's **Contracts** and the **Implementation plan** step for this ticket: the plan's files are your files.
- Unsure how a library behaves → read its docs or source, not memory.

## Contracts

| Change | In the same ticket |
|---|---|
| API request/response, status codes, error shape | your side as **Contracts** pin it; both sides only when both are in your `Files`, else `needs-input`. Keep old fields until every caller moved, unless the design calls it breaking |
| event or message schema | as above, plus a test that round-trips one message |
| DB schema | the migration is dba's ticket; you change the code that reads and writes it, in the order the design gives (expand → backfill → contract) |
| config or env var | the default, the example config, and the docs line the writer needs (name it in the Handoff) |

## States — decide each, test those that can happen

Empty / one / many / max · invalid, missing, wrong-type or too-long input · dependency error, timeout, slow response, retry · concurrent use, double submit, stale data · no permission, expired session, another user's data · partial failure halfway.

## Errors, refactoring, dependencies, safety

- Handle an error where you can act on it; otherwise propagate it with context. Never catch and ignore. User-facing errors say what to do; logs say why, without secrets or personal data. Validate at the boundary, trust inside.
- Refactor only what the ticket needs, as a separate step, tests green before and after; growing past the ticket's files → `needs-input`.
- A new dependency needs the architect's approval. Parallel agents running → no installs, no tree-wide formatter or codegen.
- Avoid N+1 queries, unbounded loops or lists, whole-table loads, blocking calls on hot paths. Input that reaches queries, shell, HTML or file paths is parameterised or escaped.

## Unit and component tests

| Cover | Example |
|---|---|
| happy path of each AC condition | valid order → saved, total correct |
| negative paths | invalid input rejected with the right error |
| boundaries | 0, 1, max, max + 1; empty string; midnight, month end |
| error handling | dependency throws or times out → the documented behaviour |
| each finding of a fix round | the exact reproduction, as a test |

- One test per equivalence class plus each boundary; a decision with several conditions → a small table of the combinations that change the outcome; state logic → each valid transition and one invalid event per state.
- Name tests by behaviour (`rejects an expired coupon`); one reason to fail; arrange → act → assert, no logic in the test.
- Fake what crosses a boundary you do not own (network, clock, randomness, third-party API); keep your own logic real. Mock only to observe an interaction the AC is about. Time and randomness come from an injectable source.
- A flaky test is a defect: find the race, shared state or real clock; never add retries or sleeps. One you did not write → report it with its failure rate; never delete or skip it.
- Never loosen an assertion or change an expected value without the AC saying the behaviour changed. Coverage is a hint where tests are missing, not proof.
