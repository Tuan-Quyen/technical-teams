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

## As a step

| Mode | Parent step | Runs | Hands back |
|---|---|---|---|
| `gate` | `feature` 7, `fix` 5, `infra` 3 | step 2 on the parent item's diff; each brief carries the qa-lines findings line, the T0/T1 no-report line and the item's known findings of that reviewer; security and dba as the parent step says; no skeptics, no step 3–4 | the verdict (`verdicts.review`) and findings in the parent item; FAIL → the parent's `fix` (findings) |

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

As a step there is no review workflow: the parent's build loop runs the gate.

## Done when

- As a step: the gate's verdict and findings are in the parent item.
- One verdict with findings by severity and a fix order; no code changed; open items untouched.
