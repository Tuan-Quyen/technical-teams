# run-kit §4 · Workspace `.team/`

Every file, its one owner and template (`${CLAUDE_PLUGIN_ROOT}/templates/…`). Hooks check what is checkable on every write.

Spec files and their owners: run-kit §1 Writes; templates under `requirements/`, `design/`, `core/`, `adr/`, `reports/`. Besides those:

| File | Kind | Owner |
|---|---|---|
| `items/<slug>.json` — step, next action, round, findings, verdicts, questions | state | the orchestrating session (§ Item state) |
| `STATE.md` — open items, resume point | view, generated from `items/` | nobody writes it |
| `reports/<slug>/qa.md`, `review.md`, `security.md`, `debug.md` | T2 only | qa, code-reviewer, security, debugger |
| `CREW.md` — emoji, names, vibes, colors | config | lead creates from `core/CREW.md`; the user edits |
| `archive/<slug>/` — files of a closed item; agents never read it unless a brief names it | — | lead |

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
- An older project (hand-written `STATE.md` with § QA-Fix state, `reports/<slug>/findings.md`): `node ${CLAUDE_PLUGIN_ROOT}/tools/team-state.mjs migrate .team` (dry run), then `--write`: one item per open row, `CART-B3` → `F3`, old files kept in `archive/`.

## Spec rules

In `specialist-rules` (preloaded into every specialist) and checked by a hook on every `.team/` write. Feedback during the loop is a finding in the item, not a spec edit.

## Compaction

At a milestone close, and to migrate a `.team/` over budget: workflow `technical-team:team-compact` (`${CLAUDE_PLUGIN_ROOT}/workflows/compact.js`), args `{ files: [{ path, owner }] }`. The owner rewrites each file to its current truth; an independent verifier compares it with the git version and the code; code checks words after ≤ before, lines ≤300, no revision headings, ≤3 rounds. Inline: the same three steps by hand.
