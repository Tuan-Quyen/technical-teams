# Evidence, RTM self-check and fix rounds

## Handoff evidence

The **Evidence** line holds real output, trimmed to its summary lines — never "tests pass" without the line that says so.

```
- Evidence:
  build: `npm run build` → compiled, 0 errors
  lint: `npm run lint -- src/cart` → 0 problems
  unit: `npm test -- cart` → 24 passed, 0 failed (3 new: cart.spec.ts › rejects expired coupon …)
  related suites: `npm test -- checkout` → 41 passed
  smoke: `npm run dev`, POST /cart/items → 201, total 19.90
  RTM self-check: CART-AC1 → cart.spec.ts › adds item ✓ · CART-AC2 → cart.spec.ts › rejects expired coupon ✓ · CART-E3 (empty cart) → manual smoke ✓
  limits: not tested on Safari; currency rounding beyond 2 decimals out of scope
```

- Each RTM condition the pre-check mapped to the ticket → the test or check that covers it, and its result. A condition you could not cover → say so and why.
- Tests added or changed are named; a changed expectation gives its reason (the AC).
- Known limits and untested scenarios are listed, never left for review to discover.
- A command that could not run → `blocked` with the exact error, not `done`.

## A fix round (bug IDs in the brief)

1. Read each bug ID's entry: qa's steps, expected, actual, evidence (`qa.md` Round detail, `findings.md`), or the reviewer's finding (`review.md`, `security.md`).
2. Reproduce it locally, or write the failing test from its steps. Cannot reproduce → `needs-input` with what you ran; do not guess a fix.
3. Fix the cause, not the symptom shown in the test.
4. Regression test at your level per bug ID; run the related suites again.
5. Handoff: per bug ID → cause in one line · fix `file:line` · test name · result. Same ID, never a new one.

## A fix from a debug report

- `.team/reports/<slug>/debug.md` gives the root cause and the fix direction: follow it. If the code shows the cause is elsewhere → `blocked` back to the debugger with evidence, not a different fix.
- qa's pre-check may have written an integration or E2E regression test failing on the unfixed code: make it pass without changing it.
- Risk high in the debug report (shared code, data, security, behaviour users rely on) → keep the change minimal and name every affected caller in the Handoff.

## When review or qa disagrees

- A finding you think is wrong → do not ignore it: say why in the Handoff with evidence (code, test, spec line); the lead routes it. Never close it yourself.
