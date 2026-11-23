# Drafts — the files and diffs behind each proposal

> Used by: retrospector · Read when: writing a proposal's draft or diff

The report holds the four-heading frame of each proposal (skill Method §5); the files it changes live beside it:

| Proposal | Draft (`drafts/<kind>/<name>.md`, kind = agents, skills, commands) | Diff (`changes.md`, heading `## <id> · <path>`, id = A1, S1, C1…) | Also |
|---|---|---|---|
| new | the full file, in its type's skeleton | – | the lists, tables and contract entries it must be added to |
| update | the full file as it should read after the change | the exact change, so it can be reviewed and applied | – |
| delete | – | the removal, and every file that names the piece | the `tests/contract.json` entry, the README tables, `tests/commands.test.mjs` lists |

A rename is a delete plus a new. A hook, workflow, template or miner change goes into the draft or diff of the agent, skill or command that owns it.

## An edit to an existing file

Give the file, the current text and the new text, or a unified diff — never "improve the wording". Keep the file's skeleton (CLAUDE.md § Document format of the plugin): write the change into the section it belongs to; an agent rule goes into its Work, Stop and report or Never, a shared rule into `specialist-rules` or run-kit §2, not into each file.

```diff
--- agents/team-<role>.md
+++ agents/team-<role>.md
@@ ## Work
-3. <current step>
+3. <new step> → verify: <check>
```

## A new or updated file

New only with ≥2 real examples from ≥2 sessions (skill Principle 3). Save it under `.team/retrospect/<YYYY-MM-DD>/drafts/<agents|skills|commands>/<name>.md`, never in the plugin. Each type keeps its skeleton (the plugin's CLAUDE.md § Document format):

| Type | Skeleton |
|---|---|
| Agent | frontmatter (below) · `# <Role>` · bold mission · `## Inputs` · `## Before you start` · `## Work` (numbered, `→ verify:`) · `## Done when` · `## Stop and report` · `## Writes` · `## Never` |
| Command | frontmatter `description`, `argument-hint`, `disable-model-invocation` · `# /technical-team:<name>` · request with `$ARGUMENTS` + the run-kit line · `## When to use` · `## Steps` (`\| # \| Step \| Agent \| Gate / verify \|`) · `## Workflow` (only with one) · `## Done when` |
| Method skill | frontmatter `name`, `description` · `# <skill> — purpose` · `## When to load` · `## Principles` (`### n. title`, bold rule, bullets, `Test:`) · `## Method` · `## Done when` · `## References` |
| Reference | `# <title>` · `> Used by: <role> · Read when: <step>` · its sections |

An agent draft:

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

## Not acted on

Each dropped or downgraded proposal, in the report's Not acted on: one line — what it was, which self-critique question it failed, the evidence it had.
