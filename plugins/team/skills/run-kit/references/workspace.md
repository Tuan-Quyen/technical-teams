# run-kit §4 · Workspace `.team/`

Every file, its one owner and template (`${CLAUDE_PLUGIN_ROOT}/templates/…`). Hooks check what is checkable on every write.

| File | Kind | Owner | Template |
|---|---|---|---|
| `items/<slug>.json` — step, next action, round, findings, verdicts, questions | state | the orchestrating session | § Item state |
| `STATE.md` — open items, resume point | view, generated from `items/` | nobody writes it | — |
| `TASKS.md` — tickets and status | spec | pm | `core/TASKS.md` |
| `PRODUCT.md` — current truth of the product | spec | ba | `core/PRODUCT.md` |
| `ARCHITECTURE.md` — overview, points to ADRs | spec | architect | `core/ARCHITECTURE.md` |
| `requirements/<slug>.md` | spec | ba | `requirements/requirements.md` |
| `system-design/<slug>.md` — design + plan | spec | architect (dba: Data and migrations) | `design/system-design.md` |
| `frontend-design/DESIGN.md`, `frontend-design/<slug>.md` | spec | designer | `design/DESIGN.md`, `design/frontend-design.md` |
| `adr/NNNN-<decision>.md` — NNNN = highest + 1 | spec | architect | `adr/adr.md` |
| `reports/<slug>/qa.md` — T2 only: test plan, RTM | spec | qa | `reports/qa.md` |
| `reports/<slug>/review.md`, `security.md` — T2 only | report | code-reviewer, security | `reports/review.md`, `reports/security.md` |
| `reports/<slug>/debug.md` — T2 only; else the repro is in the handoff | report | debugger | `reports/debug.md` |
| `CREW.md` — emoji, names, vibes, colors | config | lead creates; the user edits | `core/CREW.md` |
| `archive/<slug>/` — files of a closed item; agents never read it unless a brief names it | — | lead | — |

Evidence (test output, repro steps, round details) lives in handoffs and test files, never in a `.team/` document.

## Item state

`.team/items/<slug>.json`, written only by the orchestrating session (a hook refuses specialists). Each save is validated and regenerates `STATE.md`; an error comes back at once. Check by hand: `node ${CLAUDE_PLUGIN_ROOT}/tools/team-state.mjs check <file>`.

```json
{ "v": 1, "slug": "fix-discount", "key": "CART", "title": "Fix full discount total", "pipeline": "fix",
  "tier": "T1", "step": "qa", "status": "running", "next": "Retest F1", "round": 1, "workflows": true,
  "findings": [{ "id": "F1", "title": "Full discount adds one cent", "by": "qa", "severity": "major",
    "blocking": true, "status": "fixed", "test": "test/cart.test.js::100% off is 0", "file": "src/cart.js" }],
  "verdicts": { "qa": "FAIL · r0" }, "questions": [], "decisions": [], "notes": [] }
```
Optional: `files`, `reopened`, `detail`, `owner` (a ticket) on a finding; `questions` `{q, options}`; `decisions` `{date, by, text}`.

- `title` ≤8 words / 60 characters, verb + object, stored once; elsewhere the bare ID. `next` ≤30 words. `detail` ≤40 words. `notes` ≤5.
- `status`: `running`, `waiting-for-user`, `blocked`, `paused`, `done`. A workflow returns the item updated: write it back verbatim before anything else.
- Closed item → move its spec files to `archive/<slug>/` and delete its JSON.
- An older project with `STATE.md` § QA-Fix state and `reports/<slug>/findings.md`: on its next resume, write one item per open row (findings → `F<n>` with their status in lower case, `Fix rounds` → `round`), then move `findings.md` to the archive.

## Spec rules (hook-checked)

- Change something → rewrite that section. No heading named Revision, Revised or Round; decisions go one line each under `## Decision log`: `YYYY-MM-DD · decision · why`, ≤25 words, ≤30 lines.
- Every line ≤300 characters; ≤4,000 words per file. Bigger → split the item into milestones, or compact.
- Do not copy constants from code: write `file:symbol`. Acceptance thresholds belong to requirements or tests.
- Feedback during the loop is a finding in the item, not a spec edit; the spec changes once the decision is made.
- Bullets and table cells, one fact each, outcome first; point (`file:line`, test name, ID), do not explain.

## Compaction

At a milestone close, and to migrate a `.team/` over budget: workflow `technical-team:team-compact` (`${CLAUDE_PLUGIN_ROOT}/workflows/compact.js`), args `{ files: [{ path, owner }] }`. The owner rewrites each file to its current truth; an independent verifier compares it with the git version and the code; code checks words after ≤ before, lines ≤300, no revision headings, ≤3 rounds. Inline: the same three steps by hand.
