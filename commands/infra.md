---
description: "Infrastructure work: devops proposal → implement → code-reviewer ∥ security → runbook"
argument-hint: "<infra request>"
disable-model-invocation: true
---

Infrastructure work with the technical team:

$ARGUMENTS

Empty request → ask for the request, then stop.

1. **Propose** — `technical-team:team-devops` in proposal mode: files, tools, verification, remote steps, rollback. Show it to the user and wait for OK.
2. **Build** — `technical-team:team-devops` implements and verifies locally.
3. **Review** — in parallel: `technical-team:team-code-reviewer` and `technical-team:team-security` on the diff. Blocking → step 2.
4. **Runbook** — `technical-team:team-writer` documents build, deploy and rollback from the real files.
5. Report the exact remote commands for the user, in order, with rollback.

Never apply, deploy or push. Do not commit unless the user asks.
