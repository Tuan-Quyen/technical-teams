# Defects and the test summary

> Used by: qa · Read when: writing a finding, rating severity, or the test summary

Lifecycle, IDs and challenges: run-kit `qa-loop.md`. Blocking and scope: SKILL.md.

## A finding (structured output → the item)

```json
{ "id": "", "result": "new", "title": "Double tap creates two projects", "severity": "major", "blocking": true,
  "test": "e2e/projects.spec.ts::create is idempotent on double tap", "ac": "CART-AC1", "file": "src/screens/NewProject.tsx",
  "detail": "Create stays enabled while saving; two POST /api/projects 201. Expected disabled 'Creating…' (design state pending)." }
```

The failing test (or a one-line repro) is the evidence; steps, screenshots and logs go in the Handoff, never a `.team/` file. A known finding comes back with its `id` and `result` verified or failing.

- One defect per finding; title ≤8 words, verb + object.
- Reproducible from a known state, with seeded test data, never real data.
- Expected result cites its source (AC, design, docs, platform convention, heuristic).
- Major and above: one sentence of concrete user impact; no source + impact → at most minor.
- No fix prescriptions: a suspected location is fine, the fix is the developer's. No secrets in evidence.

## Severity

| Severity | Meaning |
|---|---|
| blocker | blocks testing or a core flow; crash on start; data loss; suspected security hole |
| critical | core function wrong with no reasonable workaround; wrong money; user misled into a harmful action |
| major | function or designed state missing or wrong with a workaround; broken on a required platform; accessibility failure on a core flow |
| minor | non-core function wrong, inconsistency, unclear copy, a cosmetic issue users notice |
| trivial | polish |

A finding has no priority: `blocking` decides what this item fixes. Priority belongs to `ISSUES.md` rows (P1 next · P2 this milestone · P3 backlog); default blocker/critical → P1, major → P2, else P3, raised for high exposure (first screen, most-used flow), with the reason.

## Test summary (T2 `qa.md` and `release`; below T2 a few lines in the Handoff)

| Section | Content |
|---|---|
| Scope | item, commit, platforms × form factors, what was out and why |
| Coverage | conditions passed · failed · blocked · not run; ACs n/n; designed states n/n; quality characteristics and their result |
| Execution | commands + summary lines; live preview evidence; exploratory charters and what they found |
| Defects | in scope: found / closed / open by severity, open and deferred with reasons; pre-existing listed apart |
| UX | conformance, heuristic issues, accessibility, design questions and their answers |
| Risks | residual risks, areas tested less and why, platforms not previewed |
| Exit criteria | each → met / not met |
| Verdict | PASS / FAIL / PASS pending design decision |
| Lessons | escaped-defect causes, missing ACs, testability problems |
