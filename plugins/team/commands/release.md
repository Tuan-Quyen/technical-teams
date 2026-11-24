---
description: "Release readiness: qa ∥ security ∥ devops (∥ dba) → changelog → GO / NO-GO; nothing is deployed"
argument-hint: "[version]"
disable-model-invocation: true
---

# /technical-team:release

Prepare a release with the technical team: $ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*.

## When to use

- "Ready to release? / prepare version X". Nothing is deployed.
- Range = last tag (`git describe --tags --abbrev=0`) → `HEAD`; no tag yet → all history.
- **Version** — resolve it before step 1; the slug is `release-<version>`. Given → use it. No tag → `0.1.0`. Else propose the next semver from the range's commits (any breaking → major, else any `feat` → minor, else patch) and use it.

## As a step

| Mode | Parent step | Runs | Hands back |
|---|---|---|---|
| `gate` | `new` 5 (version from the parent) | steps 1–3 with the parent item in `items`; only the gates whose code changed since the last milestone passed | GO / NO-GO with its reasons to the parent; no own item, no close |

## Steps

| # | Step | Agent | Gate / verify |
|---|---|---|---|
| 1 | Gates, in parallel | `technical-team:team-qa` — full suite and a smoke check of the main flows · `technical-team:team-security` — the range plus a dependency audit · `technical-team:team-devops` — build, config names, migration order, deploy and rollback readiness (local checks only), in its reply · `technical-team:team-dba` — only if migrations were added in the range | each gate's PASS / FAIL |
| 2 | Notes | `technical-team:team-writer` drafts the CHANGELOG / release notes for the range, breaking changes first, and a **Known issues** list from the open rows of `.team/ISSUES.md` (bugs only, ID and title; none → no section) | version is the orchestrator's: confirm it matches the range's changes or flag a mismatch; do not pick another |
| 3 | Report | – | **GO** or **NO-GO** with reasons, blocking items, test results and the exact commands the user runs (tag, push, deploy, rollback) |

- Inline, any open item with a blocking finding not verified, deferred or rejected is NO-GO. An open `.team/ISSUES.md` row with severity blocker or critical, or priority P1, is NO-GO unless the user accepts it (their words in the item's `decisions`).
- Close per orchestrator §6; a gate's blocking finding left open becomes a `new` row too.

## Workflow

**Step 1** — **Workflow** (run-kit §2 opt-in; the inline steps are the gates above; step `1 (workflow)`; briefs for the four gates plus `writer` for step 2, which carries the same Known issues line): call Workflow with `name: 'technical-team:team-release'` (`${CLAUDE_PLUGIN_ROOT}/workflows/release.js`) and `args` = `{slug, briefs: {"qa": "…", "security": "…", "devops": "…", "dba": "<only with migrations>", "writer": "…"}, items, issues, context}` — `items` (required): every `.team/items/*.json` object, i.e. all open items (`[]` when none); `issues` (required): the open `.team/ISSUES.md` rows with severity blocker or critical, or priority P1, as `{id, title, severity, priority, accepted}` (`accepted: true` only when the user accepted it, their words in `decisions`; `[]` when none). It runs the gates in parallel, then the writer with their verdicts, and returns `{gates, notes, needsUser, goNoGo, items, issues}`: any item not `clear` (blocked, open blockers) or issue not accepted makes it NO-GO whatever the gates say. Route the result per run-kit §6, then go to step 3 (skip step 2).

## Done when

- A GO / NO-GO with its reasons and the user's exact commands. Nothing tagged, pushed or deployed.
- As a step: the verdict is back with the parent.
