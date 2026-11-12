---
description: "Read-only review: code-reviewer ∥ security on a diff, merged into one verdict"
argument-hint: "[branch | path | commit range] — default: current changes"
disable-model-invocation: true
---

Review this target with the technical team: $ARGUMENTS

1. Resolve the scope first (`git status`, `git diff --stat`). No target → uncommitted changes plus the branch vs its base; nothing there → `HEAD~1..HEAD`.
2. In parallel, with the same scope in both briefs:
   - `technical-team:team-code-reviewer` — correctness, contracts, tests, design, readability.
   - `technical-team:team-security` — vulnerabilities, secrets, access control, dependencies.
   Add `technical-team:team-dba` if the diff has migrations or schema changes.
3. Merge into one report: verdict **pass** or **blocked**, de-duplicated findings by severity with `file:line`, suggested fix order.

Do not change code. Offer `/technical-team:fix` or the developer for blocking findings.
