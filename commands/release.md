---
description: "Release readiness: qa ∥ security ∥ devops (∥ dba) → changelog → GO / NO-GO; nothing is deployed"
argument-hint: "[version]"
disable-model-invocation: true
---

Prepare a release with the technical team: $ARGUMENTS

Range = last tag (`git describe --tags --abbrev=0`) → `HEAD`; no tag yet → all history, default version `0.1.0`.

1. In parallel:
   - `technical-team:team-qa` — full test suite and a smoke check of the main flows.
   - `technical-team:team-security` — changes in the range plus a dependency audit.
   - `technical-team:team-devops` — build, config names, migrations order, deploy and rollback readiness (local checks only).
   - `technical-team:team-dba` — only if migrations were added in the range.
2. `technical-team:team-writer` drafts the CHANGELOG / release notes for the range, breaking changes first. No version given → propose one by semver.
3. Report **GO** or **NO-GO** with reasons, blocking items, test results and the exact commands the user runs (tag, push, deploy, rollback).

Never tag, push, publish or deploy.
