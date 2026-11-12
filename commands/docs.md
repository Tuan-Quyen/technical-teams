---
description: "Bring docs back in sync with the code (writer); --adr to record an architecture decision (architect)"
argument-hint: "[scope] | --adr <decision>"
disable-model-invocation: true
---

Documentation work with the technical team: $ARGUMENTS

- **Default** — `technical-team:team-writer` compares the docs in scope (default: README, CHANGELOG, API docs) with the code, config and scripts, fixes what is wrong, fills what is missing and marks what is unverified. Report the docs changed and the discrepancies found.
- **`--adr <decision>`** — `technical-team:team-architect` writes `.team/adr/NNNN-<title>.md` (status `accepted` if the user says it is decided, else `proposed`) and marks any superseded ADR. Report the path and the decision in one sentence. No decision given → ask what to record.

Do not commit or push unless the user asks.
