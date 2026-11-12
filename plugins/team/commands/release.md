---
description: "Release readiness: qa ∥ security ∥ devops (∥ dba) → changelog → GO / NO-GO; nothing is deployed"
argument-hint: "[version]"
disable-model-invocation: true
---

Prepare a release with the technical team: $ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§6 — Read it if you are not already the lead. Slug: `release-<version>`. Range = last tag (`git describe --tags --abbrev=0`) → `HEAD`; no tag yet → all history, default version `0.1.0`.

1. In parallel:
   - `technical-team:team-qa` — full suite and a smoke check of the main flows → `.team/reports/<slug>/qa.md`.
   - `technical-team:team-security` — the range plus a dependency audit → `.team/reports/<slug>/security.md`.
   - `technical-team:team-devops` — build, config names, migration order, deploy and rollback readiness (local checks only), in its reply.
   - `technical-team:team-dba` — only if migrations were added in the range.
2. `technical-team:team-writer` drafts the CHANGELOG / release notes for the range, breaking changes first. No version given → propose one by semver.
3. Report **GO** or **NO-GO** with reasons, blocking items, test results and the exact commands the user runs (tag, push, deploy, rollback). Close per lead §6.

Never tag, push, publish or deploy.
