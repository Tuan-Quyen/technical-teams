---
description: "New project from an idea or PRD: ba → architect ∥ designer → pm milestones → each milestone like a feature → release check"
argument-hint: "<idea | path/to/PRD> (empty = resume)"
disable-model-invocation: true
---

Start a new project with the technical team:

$ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §1 and §3–§6 — Read it if you are not already the lead. Empty request → resume from `.team/STATE.md`, or ask for the idea or PRD path. Not a git repo → ask the user to run `git init` first.

1. **Requirements** — `technical-team:team-ba` writes `.team/PRODUCT.md` and the MVP `.team/requirements/<slug>.md`. Show its questions to the user and wait.
2. **Stack + design** — in parallel: `technical-team:team-architect` proposes 2–3 stacks with one recommended, writes `ARCHITECTURE.md` and the ADRs (numbers from the lead); `technical-team:team-designer` writes `frontend-design/DESIGN.md` (if there is UI). Show the user and wait for the stack choice.
3. **Plan** — `technical-team:team-architect` writes `.team/system-design/<slug>.md`; `technical-team:team-pm` writes the tickets in `TASKS.md` grouped by milestone (M1 = walking skeleton: build, lint, test runner, one end-to-end slice). Show the milestones and wait for OK.
4. **Build** — per milestone, run steps 5–7 of `${CLAUDE_PLUGIN_ROOT}/commands/feature.md` on its tickets. Record the milestone in STATE.md's Next step. After each milestone show what works and how to run it; wait for OK.
5. **Ship** — `technical-team:team-devops` adds CI and run/deploy files; `technical-team:team-writer` writes the README; then run `${CLAUDE_PLUGIN_ROOT}/commands/release.md` with version `0.1.0`.
6. **Close** — lead §6.

Never deploy, tag, commit or push; give the user the commands.
