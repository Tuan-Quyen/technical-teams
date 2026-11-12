---
description: "Build a feature: ba → (designer) → architect → developer → code-reviewer ∥ security → qa → writer"
argument-hint: "<feature description> [--small]"
disable-model-invocation: true
---

Build this feature with the technical team:

$ARGUMENTS

Empty request → ask what to build, then stop. Pick a short kebab-case `<slug>` for `.team/<slug>/`. Each agent starts cold: every brief names the request, the relevant paths and the `.team/<slug>/` files to read.

`--small` (or a clearly small change that fits existing patterns): skip steps 1–3; write 2–5 expected-behaviour bullets into the developer's brief.

1. **Spec** — `technical-team:team-ba` writes `spec.md`. If it returns questions, show them to the user and wait; pass the answers back.
2. **UI** — only if there is user-facing UI: `technical-team:team-designer` writes `ui.md`.
3. **Plan** — `technical-team:team-architect` writes `plan.md` with tasks. Show the user a short plan summary and wait for OK.
   Schema or data change → also `technical-team:team-dba` for the migration plan.
4. **Build** — `technical-team:team-developer` per task in dependency order. Tasks with disjoint files may run in parallel. Migrations → `technical-team:team-dba` alongside.
5. **Review** — in parallel: `technical-team:team-code-reviewer` on the diff, and `technical-team:team-security` if the change touches auth, user input, data access, secrets, payments or personal data. Blocking → back to step 4.
6. **Test** — `technical-team:team-qa` writes and runs tests and checks the running product. FAIL → back to step 4 (or `technical-team:team-debugger` if the cause is unclear).
7. **Docs** — `technical-team:team-writer` if usage, API or operations changed.
8. Summarise: what was built, files changed, test evidence, review verdicts, deferred items.

Do not commit or push unless the user asks.
