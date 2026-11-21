Result: root cause found | not reproduced

# <slug> — debug

> **T2 only** (below T2: the Handoff). Owner: **team-debugger**.
> **Budget:** ≤ 50 lines, lines ≤ 300 characters; output trimmed to the lines that prove it.

## Symptom
<as reported: error text, failing command, environment>

## Reproduction
```
<exact command>
<output>
```

## Root cause
<one sentence: the cause, and where it surfaces>

Evidence: <file:line, log lines, commit>

## Fix direction
<precise enough that the developer need not re-diagnose>

Risk: low (local) | high (shared code, data, security, relied-on behaviour)

## Regression test idea
<what the test does and asserts>

## Tried (only when not reproduced)
- <attempt → result>
