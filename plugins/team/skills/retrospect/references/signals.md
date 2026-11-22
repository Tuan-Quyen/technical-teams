# Signals — threshold, file to open, usual noise

> Used by: retrospector · Read when: judging a digest signal

| Signal (digest id) | Real when | Open | Usual noise |
|---|---|---|---|
| `by-hand-<type>` | ≥3 prompts of one work type ran without the team, in ≥2 sessions | `skills/run-kit/SKILL.md` §2 routing table, the command and agent whose description should trigger | chat about the plugin itself; a question; a one-line task the routing table sends to no pipeline on purpose |
| `corrections-<actor>` | ≥2 corrections after the same actor | that agent or command: the step the correction pushes back on | a follow-up question; a new request starting with "no," |
| `repeated-*`, `similar-opening` | one instruction in ≥3 sessions | the skill or agent that should hold it as a rule | test prompts of a probe series |
| `long-prompts` | ≥3 prompts of 1,500+ chars written from scratch | the command that should take a short argument instead | pasted specs (a BRIEF, a PRD) |
| `manual-handoffs` | any pasted Handoff block between agent steps | the orchestrator's handoff routing; the workflow that should carry it | the user quoting a report to ask about it |
| `handoff-missing` / `non-standard` / `invalid-next-*` | ≥2 runs, or ≥25% of a role's runs | `skills/specialist-rules` Handoff, the agent's Done when | probes told to answer "ok"; runs of a version where the role had another name (`team-lead`) |
| `handoff-blocked` / `needs-input` | ≥2 runs of a role | the agent's Stop and report; the brief it got | `needs-input` from ba asking real questions is the design |
| `guard-<rule>-<role>` | ≥3 firings of one rule for one role | `hooks/guard.mjs` rule, the agent prompt that should prevent it | a test session that triggers the guard on purpose |
| `tool-errors-*`, `denials-*` | ≥3 per role, a repeated cause | the agent's Work steps, `disallowedTools`, its tool guidance | the environment: a browser tab it cannot drive, a sleep the harness blocks, a denied permission |
| `respawn-<role>-<session>` | ≥4 spawns of one role in one session | `skills/run-kit/references/qa-loop.md`, the brief format | a long `new` run with many milestones |
| `skipped-steps` | >30% of code-changing sessions without tests or review | run-kit §2, the command's Steps table | a docs-only change the miner took for code |
| `cost-<role>` | one role ≥30% of specialist cost over ≥3 calls | the agent's `model`, the size of its prompt and references | one huge run (open it) |
| `orchestrator-edits`, `other-agent-*` | ≥3 edits / ≥2 spawns of a non-team agent in plugin sessions | the orchestrator's rules; the roster gap the agent filled | sessions developing the plugin itself |
| `unused-*` | a component never used in ≥5 plugin sessions **and** a second signal (overlap, or its work done another way) | its description, the routing table | a pipeline the window simply never needed |
| `unknown-*`, `old-versions` | – | – | evidence for a renamed or removed piece: discount it unless the cause is still in the current file |
| `compactions`, `api-errors`, `hook-errors` | compactions in ≥2 sessions | the orchestrator's context: run-kit and its references | API limits and network: never a plugin defect |
