Result: root cause found | not reproduced

# <slug> — debug

> Owner: **team-debugger**.
> **Budget:** ≤ 50 lines. Symptom and root cause one line each; output trimmed to the lines that prove it.

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

Risk: low (local) | high (shared code / data / security / behaviour users rely on)

## Regression test idea
<what the test does and asserts>

## Tried (only when not reproduced)
- <attempt → result>
