---
description: "New project from an idea or PRD: ba → architect (+designer) → pm milestones → build each milestone like a feature → release check"
argument-hint: "<idea | path/to/PRD>"
disable-model-invocation: true
---

Start a new project with the technical team:

$ARGUMENTS

Empty request → ask for the idea or PRD path, then stop. Use `<slug>` = the project name for `.team/<slug>/`. Not a git repo → ask the user to run `git init` first.

1. **Requirements** — `technical-team:team-ba` writes the MVP `spec.md` (scope in/out, stories, ACs). Show its questions to the user and wait.
2. **Stack + design** — in parallel: `technical-team:team-architect` proposes 2–3 stack options with one recommended and the ADRs; `technical-team:team-designer` proposes the UI direction (if there is UI). Show the user and wait for the stack choice.
3. **Plan** — `technical-team:team-architect` writes `plan.md`; then `technical-team:team-pm` splits it into milestones (M1 = walking skeleton: build, lint, test runner, one end-to-end slice). Show the milestones and wait for OK.
4. **Build** — for each milestone, run steps 4–6 of `/technical-team:feature` on its tasks (developer → review → qa). After each milestone show what works and how to run it locally; wait for OK before the next.
5. **Ship** — `technical-team:team-devops` adds CI and run/deploy files; `technical-team:team-writer` writes the README; then run `/technical-team:release` with version `0.1.0`.

Never deploy, tag, commit or push; give the user the commands.
