---
description: "Review: code-reviewer ∥ security on a diff, merged into one verdict; no code changes"
argument-hint: "[branch | path | commit range] — default: current changes"
disable-model-invocation: true
---

# /technical-team:review

Review this target with the technical team: $ARGUMENTS

Load `technical-team:run-kit` and run this per its §2 *Running a pipeline*. Slug: `review-<branch or date>`.

## When to use

- "Review / check this diff / audit security". No code changes.
- No target → uncommitted changes plus the branch vs its base; nothing there → `HEAD~1..HEAD`.

## Steps

| # | Step | Agent | Gate / verify |
|---|---|---|---|
| 1 | Scope | – (`git status`, `git diff --stat`) | the same scope goes into every brief |
| 2 | Review, in parallel | `technical-team:team-code-reviewer` · `technical-team:team-security` · `technical-team:team-dba` if the diff has migrations | each reviewer's PASS / FAIL |
| 3 | Report | – | one verdict (PASS only if both pass), the de-duplicated findings by severity with `file:line`, and a fix order |
| 4 | Close | – | as run-kit §2 *Check-only* |

- Findings on a diff that no open item owns → offer `${CLAUDE_PLUGIN_ROOT}/commands/triage.md` with them as its list (qa imports and ranks them; source `review-<branch or date>`; disputed ones stay in the report only); an open item's findings stay with that item.

## Workflow

**Step 2** — **Workflow** (run-kit §2 opt-in; the inline steps are the list above; step `2 (workflow)`): call Workflow with `name: 'technical-team:team-review'` (`${CLAUDE_PLUGIN_ROOT}/workflows/review.js`) and `args` = `{slug, briefs: {"code-reviewer": "<brief>", "security": "<brief>", "dba": "<brief, only with migrations>"}, items, context}` — `items` (required): the `.team/items/<slug>.json` objects of the open items the diff belongs to (`[]` when none). It returns `{verdict, findings, disputed, handoffs, needsUser, items}`: `items` gives each item's status (`clear`, `open-blockers`, `BLOCKED_PENDING_USER_DECISION`, `invalid`); the review verdict never moves an item: each blocking finding was re-checked by a skeptic of the same role, and refuted ones sit in `disputed`, not deleted. Route the result per run-kit §6, and report the `disputed` findings (marked disputed, with the skeptic's reason; the owners decide; review.js returns them at top level and has no `status`), then go to step 3.

## Done when

- One verdict with findings by severity and a fix order; no code changed; open items untouched.
