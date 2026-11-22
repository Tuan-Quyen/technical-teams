# run-kit §4 · Workspace `.team/`

> Used by: the orchestrating session · Read when: creating or checking a `.team/` file, the item JSON, an ID or a compaction

Every file, its one owner and template (`${CLAUDE_PLUGIN_ROOT}/templates/…`).

Spec files and their owners: run-kit §1 Writes; templates under `requirements/`, `design/`, `core/`, `adr/`, `reports/`. Besides those:

| File | Kind | Owner |
|---|---|---|
| `items/<slug>.json` — step, next action, round, findings, verdicts, questions | state | the orchestrating session (§ Item state) |
| `STATE.md` — open items, resume point | view, generated from `items/` | nobody writes it |
| `reports/<slug>/qa.md`, `review.md`, `security.md`, `debug.md` | T2 only | qa, code-reviewer, security, debugger |
| `ISSUES.md` — the project's issue list (bugs, enhancements, debt), ranked | backlog, template `core/ISSUES.md` | qa (triage, test, an item's final qa run); the orchestrator sets only `item` and `in-progress` when an item starts from a row |
| `archive/<slug>/` — files of a closed item; agents never read it unless a brief names it | — | orchestrator |

Evidence (test output, repro steps, round details) lives in handoffs and test files, never in a `.team/` document.

## Item state

`.team/items/<slug>.json`, written only by the orchestrating session. Each save regenerates `STATE.md` (hook). Check it after each write: `node ${CLAUDE_PLUGIN_ROOT}/tools/team-state.mjs check <file>`.

```json
{ "v": 1, "slug": "fix-discount", "key": "CART", "title": "Fix full discount total", "pipeline": "fix",
  "tier": "T1", "step": "qa", "status": "running", "next": "Retest F1", "round": 1, "workflows": true,
  "findings": [{ "id": "F1", "title": "Full discount adds one cent", "by": "qa", "severity": "major",
    "blocking": true, "status": "fixed", "test": "test/cart.test.js::100% off is 0", "file": "src/cart.js" }],
  "verdicts": { "qa": "FAIL · r0" }, "questions": [], "decisions": [], "notes": [] }
```
Optional: `area` (the module in capitals, `STORE`; default the slug's first word; STATE.md shows `[AREA] [FEATURE]`); `files`, `reopened`, `detail`, `owner` (a ticket) on a finding; `questions` `{q, options}`; `decisions` `{date, by, text}`.

- `title` ≤8 words / 60 characters, verb + object, stored once; elsewhere the bare ID. `next` ≤30 words. `detail` ≤40 words. `notes` ≤5.
- `status`: `running`, `waiting-for-user`, `blocked`, `paused`, `done`. A workflow returns the item updated: write it back verbatim before anything else.
- Closed item → move its spec files to `archive/<slug>/` and delete its JSON.
- An older project (hand-written `STATE.md` with § QA-Fix state, `reports/<slug>/findings.md`): `node ${CLAUDE_PLUGIN_ROOT}/tools/team-state.mjs migrate .team` (dry run), then `--write`: one item per open row, `CART-B3` → `F3`, old files kept in `archive/`.

## Spec rules

In `specialist-rules` (preloaded into every specialist); compaction checks them in code. Feedback during the loop is a finding in the item, not a spec edit.

## Compaction

At a milestone close, and to migrate a `.team/` over budget: workflow `technical-team:team-compact` (`${CLAUDE_PLUGIN_ROOT}/workflows/compact.js`), args `{ files: [{ path, owner }] }`. The owner rewrites each file to its current truth; an independent verifier compares it with the git version and the code; code checks words after ≤ before, each file ≤4,000 words, lines ≤300, no revision headings, ≤3 rounds. Inline: the same three steps by hand. `ISSUES.md` (owner qa) drops its closed rows there.

## IDs people can read

Item **key**: 2–6 capitals or digits from the slug (`cart-checkout` → `CART`), in the item and its TASKS.md heading; it never changes. People read an item as its label `[AREA] [FEATURE]` (`[CART] [CHECKOUT]`; `area` defaults to the slug's first word): use it in reports and questions, the slug only for files. Tickets `CART-T1`, milestones `CART-M1` (pm); ACs `CART-AC1`, edge cases `CART-E1`, decisions `CART-D1` (ba, designer, architect); findings `F1` in the item (`CART#F1` elsewhere); `BR-1`, `G-1` in PRODUCT.md. To the user, an ID comes with its short title once per line: `F3 (save fails on second click)`. Old IDs (`T-1`, `AC1`…): `node ${CLAUDE_PLUGIN_ROOT}/skills/run-kit/scripts/migrate-ids.mjs <project>`.
