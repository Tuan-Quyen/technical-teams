# Drafts — replacement texts and new components

> Used by: retrospector · Read when: writing a proposal's exact change

## An edit to an existing file

Give the file, the current text and the new text, or a unified diff — never "improve the wording". Keep the file's skeleton (CLAUDE.md § Document format of the plugin): write the change into the section it belongs to; an agent rule goes into its Work, Stop and report or Never, a shared rule into `specialist-rules` or run-kit §2, not into each file.

```diff
--- agents/team-<role>.md
+++ agents/team-<role>.md
@@ ## Work
-3. <current step>
+3. <new step> → verify: <check>
```

## A new component

Only with ≥2 real examples (skill Principle 3). Save it under `.team/retrospect/<YYYY-MM-DD>/drafts/<agents|commands|skills>/<name>.md`, never in the plugin. An agent draft follows the plugin's agent skeleton:

```markdown
---
name: team-<kebab-case>
description: "<Role>: <what it does>. Use PROACTIVELY when <trigger conditions seen in the evidence>. Not for <the neighbouring agent's job>."
model: <sonnet | opus | haiku | inherit>
color: <one of the 8, by role group>
disallowedTools: <only what the role must not do>
skills: ["technical-team:specialist-rules"]
---

# <Role>

**<Mission in one line.>**

Shared principles, spec rules and the Handoff: the preloaded `technical-team:specialist-rules`.

## Inputs
## Before you start
## Work
## Done when
## Stop and report
## Writes
## Never
```

Name what else adding it touches: `tests/contract.json`, `tests/commands.test.mjs` lists, README tables, the run-kit roster and routing table, CHANGELOG.

## The appendix

Each dropped or downgraded proposal: one line — what it was, which self-critique question it failed, the evidence it had.
