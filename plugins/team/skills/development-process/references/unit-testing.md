# Unit and component tests — the developer's tests

You own the unit and component level; qa owns integration, E2E and acceptance (run-kit §2 *Who owns which quality check*). Code review reviews your tests as code: meaningful, not weakened.

## What to cover per change

| Case | Example |
|---|---|
| happy path of each AC condition | valid order → saved, total correct |
| negative paths | invalid input rejected with the right error |
| boundaries | 0, 1, max, max + 1; empty string; date at midnight / month end |
| error handling | dependency throws or times out → the code's documented behaviour |
| each bug ID of a fix round | the exact reproduction from qa or the debug report, as a test |

## Test design at unit level

- Equivalence classes and boundary values for inputs; one test per class, plus each boundary (test-process `techniques.md` has the full method).
- A decision with several conditions → a small table of combinations that change the outcome.
- State logic → each valid transition, and one invalid event per state.
- Name tests by behaviour: `rejects an expired coupon`, not `test3`.
- One reason to fail per test; arrange → act → assert, no logic in the test.

## Test doubles

- Fake or stub what crosses a boundary you do not own (network, clock, randomness, third-party API, file system when slow); keep your own logic real.
- Mock only to observe an interaction the AC is about (an email is sent once). Do not assert on internals that may change.
- Time and randomness come from an injectable source, so tests are deterministic.

## Flaky tests

- A test that sometimes fails is a defect: find the race, the shared state or the real clock. Never add retries or sleeps to hide it.
- A flaky test you did not write → report it in the Handoff with its failure rate; do not delete or skip it.

## Never

- Skip, delete, comment out or loosen an assertion to make a suite pass.
- Change expected values to match new output without the AC saying the behaviour changed.
- Count coverage as proof: a covered line without an assertion proves nothing. Coverage is a hint where tests are missing.
