# run-kit §3 · QA brief lines (inline runs)

Only for a step you brief yourself; a `build-loop.js` run appends the same text. Put each line verbatim under **Constraints**.

- **Every qa and reviewer brief**, then the item's known findings, one per line (`F1 fixed major blocking src/cart.js <test> <title>`):
  `Findings: each defect is a failing test or a one-line repro command (test), title at most 8 words, no report prose. Known findings are listed below by ID: re-check each one you are shown and return it with that id and result verified or failing; never give a known defect a new finding. A new one has id "" and result new. Blocking means it breaks an AC, is a regression, or is a critical risk; a blocking finding without a test counts as non-blocking.`
- **qa pre-check** (T2 only, before the first developer):
  `QA mode: pre-check. No code exists yet: review the ACs for gaps and contradictions and list the checks you will run. A fix: run the reproduction and write the regression test now, failing on the unfixed code. A spec issue that needs a decision is a blocking finding with test "spec: <what conflicts>"; never invent the expected behaviour.`
- **qa, first run** (after review PASS):
  `QA mode: execution. Run the test suite and the regression test, check every AC at the item tier, live-check user-facing changes. List what you could not check in notRun: not run is never PASS.`
- **qa, every later run**:
  `QA mode: retest. Re-check only the findings listed below and re-run the test suite; no new exploratory scope. A new finding only for a regression the fix caused.`
- **T0 and T1, every gate**:
  `Write no report file at this tier, even if a Write line above names one: the verdict and findings go in the structured output only.`
- **Every fix step** (developer), above the findings to fix (a finding challenged before ends with `· challenged before`):
  `Fix: fix the cause, never special-case a test, its data or its input. Return each finding below by its id with result fixed, or challenged when you can show it is wrong (its test asserts what no AC or spec says, it is out of scope, or it conflicts with the spec), with the evidence in detail: the AC or spec line, or a command and its output. One marked "challenged before" can no longer be challenged. Challenge on evidence, never to skip work.`
- **A gate with a challenged finding of its own**, after the findings rule; the finding line ends with `· challenge: <the fixer's evidence>`:
  `Challenged findings are listed below with the fixer's evidence. Return each one of yours by its id with result conceded when the evidence holds, or maintained with your counter-evidence in detail. Concede only on evidence, never to end the loop; maintain only on evidence, never to win. Your verdict counts only the findings you maintain.`
