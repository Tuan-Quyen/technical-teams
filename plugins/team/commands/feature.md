---
description: "Build a feature: ba → (designer) → architect → pm → developer → code-reviewer ∥ security → qa → writer"
argument-hint: "<feature description> [--small]"
disable-model-invocation: true
---

Build this feature with the technical team:

$ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§6 (slug, STATE.md, TASKS.md, briefs, handoffs, closing) — Read it if you are not already the lead. Empty request → ask what to build, then stop.

`--small` (fits existing patterns: no new screen, contract or migration): skip steps 1–4; write 2–5 expected-behaviour bullets into STATE.md and the developer's brief (no tickets).

1. **Requirements** — `technical-team:team-ba` writes `.team/requirements/<slug>.md`. Questions → show them to the user, wait, pass the answers back.
2. **Frontend design** — only with user-facing UI: `technical-team:team-designer` writes `.team/frontend-design/<slug>.md` (and `DESIGN.md` if missing).
3. **System design** — `technical-team:team-architect` writes `.team/system-design/<slug>.md`. Schema or data change → `technical-team:team-dba` fills its "Data and migrations" section. Show the user a short summary and wait for OK.
4. **Tickets** — `technical-team:team-pm` writes the item's tickets in `.team/TASKS.md`.
5. **Build** — `technical-team:team-developer` per ticket in dependency order; tickets with disjoint files may run in parallel. Migration tickets → `technical-team:team-dba`.
6. **Review** — in parallel: `technical-team:team-code-reviewer` → `.team/reports/<slug>/review.md`, and `technical-team:team-security` → `.team/reports/<slug>/security.md` if the change touches auth, user input, data access, secrets, payments or personal data. FAIL → step 5 with the finding IDs.
7. **Test** — `technical-team:team-qa` → `.team/reports/<slug>/qa.md`. FAIL → step 5 (or `technical-team:team-debugger` if the cause is unclear), then review again.
8. **Docs** — `technical-team:team-writer` if usage, API or operations changed.
9. **Close** — lead §6.

Do not commit or push unless the user asks.
