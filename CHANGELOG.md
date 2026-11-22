# Changelog — technical-team plugin

Format: each release lists **Breaking**, **Deprecated**, **Removed**, **Migration** when they apply. Public names and paths are pinned in `tests/contract.json`.

## 0.38.0 — 2026-11-22 (an issue list with one home)

- **`.team/ISSUES.md`** (template `core/ISSUES.md`): one ranked row per issue — `I<n>`, type, severity, priority, area, status, source, item. Owner qa; the lead only adds `new` rows and sets `status` / `item` (a deliberate exception to one-owner-per-file, so closing an item costs no extra spawn).
- **`/technical-team:triage [list]`**: imports a loose list (a file or pasted text) as `new` rows, then one qa spawn (`QA mode: triage`, static) sets type, severity, priority and area, merges duplicates and marks `needs-info`; the lead reports the top rows and you pick what to fix. No item.
- Issues no longer vanish: at item close (lead §6) the issue the item came from → `fixed` / `not-a-bug`, and every non-blocking finding still open or deferred → a `new` row (`<slug>#F2`). `/technical-team:test` adds its production-code failures as rows.
- **`/run` triages by itself**: a request with several bugs or issues (a list, a file) → `triage`, then your pick runs as `fix` / `feature`; `/run` with no request and no open item → the top issues instead of "what to work on?"; an item close leaving 5+ `new` rows → triage before the report; a bug matching an open row → `fix I<n>`, no duplicate.
- **`review`**: findings on a diff no open item owns become `new` rows (disputed ones stay in the report); 5+ → triage.
- **`release`**: an open issue with severity blocker or critical, or priority P1, is NO-GO unless you accept it (recorded in `decisions`), inline and in `release.js` (new required arg `issues`, returned as `issues`); the writer adds **Known issues** from the open bug rows; a gate's blocking finding left open becomes a row.
- `ISSUES.md` keeps a `Next ID` line, so compaction never frees an ID for reuse.
- `/technical-team:fix I3` and `/technical-team:feature I3` take an issue ID: its row is the symptom, set `in-progress` with the item's slug.
- Compaction drops closed rows from `ISSUES.md`; git keeps them.

## 0.37.0 — 2026-11-22 (item labels people can read)

- **Item label `[AREA] [FEATURE]`** (`[CART] [CHECKOUT]`, `[STORE] [BANNER]`): `STATE.md` shows it first and sorts by it, so one area's items sit together; the `TASKS.md` heading starts with it; the lead names items by it in reports. IDs are unchanged (`CART-T1`).
- New optional item field `area` (the module in capitals, e.g. `STORE` for `banner-carousel`); default: the slug's first word.
- One key derivation (`deriveKey` in `team-state.mjs`, used by `migrate` and `migrate-ids.mjs`): first word, then more letters of the slug (`cart-charges` → `CARTCH`); never a digit suffix. None free → `migrate` skips the item with a note, `migrate-ids` asks for `--key`.
- `STATE.md` gains a `Slug` column after `Key`.

## 0.36.0 — 2026-11-22 (challenges: agents push back with evidence)

- **Challenge in the QA-Fix loop** (`build-loop.js`, run-kit `qa-loop.md` § Challenges): a developer who can show a finding is wrong (its test asserts what no AC or spec says, out of scope, conflicts with the spec) returns it `challenged` with evidence instead of coding around it. Once per finding; without evidence it counts as fixed. The finder's next gate run concedes (→ `rejected`) or maintains; only a maintained one starts a read-only arbiter (`upheld` → `open`, `refuted` → `rejected`, `spec` → stop for the spec owner). No extra round; each outcome is a line in `decisions`.
- New finding status `challenged` and field `challenge` (≤40 words) in the item schema (`team-state.mjs`).
- `specialist-rules`: every role may challenge its input (finding, AC, design, ticket) with evidence — `needs-input` + a `Challenge:` line outside the loop; concede when the other side's evidence holds.
- Anti-gaming: the fix step says "fix the cause, never special-case a test, its data or its input"; developer's Never list and code-reviewer's test check carry the same rule (blocking in a fix round).
- Cost (measured on 157 local specialist calls; cost-equivalent tokens): a fix round ≈ 414k (developer ~60k, reviewer re-check 224k, qa retest ~130k). Fixed overhead of the new brief lines ≈ +1.2% per item; a conceded challenge ≈ +1.5%, an arbitrated one ≈ +6%, against ≈ +122% for a 3-round ping-pong it prevents.

 (redesign P4: cleanup, migration, docs)

- **Migration in code:** `node tools/team-state.mjs migrate .team` (dry run; `--write`) moves a 0.31/0.32 workspace — hand-written `STATE.md` with § QA-Fix state and `reports/<slug>/findings.md` — to `.team/items/*.json` (`CART-B3` → `F3`, round, statuses, reopen count); the old files go to `archive/`.
- Spec rules now ride in `specialist-rules` (every specialist sees them before writing; the hook still checks). The obsolete "count Budget lines" rule is gone.
- `run-kit` reference `qa-lines.md`: the verbatim brief lines, read only for inline steps (a workflow appends them itself). Lead context for one `feature` run: 4,849 words (v0.31: 9,508).
- README rewritten for lanes, tiers and the item model.
- **Removed the eval harness** (`plugins/team/evals/`, `scripts/eval-run.mjs`, `scripts/eval-summary.mjs`, the `eval:*` npm scripts): it cost real tokens per run. The numbers it produced stay in this changelog. `scripts/measure.mjs` (redesign-only static metrics) is removed too.
- PLUGIN-REPORT (0.22 Pomodoro) issues: 1, 2, 3, 4, 7, 9, 10, 11, 12 fixed; 5, 6 obsolete (line budgets are checked by hook, no agent counts lines); 8 partly (the Handoff block is enforced by hook, the reply's opening emoji is not).

### Migration guide (0.31 / 0.32 → 0.35)

1. Update the plugin, then in the project: `node <plugin>/tools/team-state.mjs migrate .team` and read the dry run.
2. `--write` — one item per open STATE.md row; `STATE.md` is regenerated; the old one is `archive/STATE-0.32.md`.
3. Old ticket/AC IDs (`T-1`, `AC1`): `node <plugin>/tools/migrate-ids.mjs <project>` as before.
4. A `.team/` spec over 4,000 words: run compaction at the next milestone (`run-kit` `workspace.md` § Compaction).

## 0.34.0 — 2026-11-21 (redesign P3b: lanes by tier)

- **Lanes by tier** in `feature` and `fix`: T0 (`--small`, the user's flag) developer → code-reviewer; T1 ba or debugger → developer → code-reviewer (∥ security / dba when the diff touches them) → qa, at most 4 spawns; T2 the full pipeline with designer, architect, pm and the qa pre-check. `--tier T0|T1|T2` forces one; the lead may raise a tier, lowering one is noted in the item.
- T2 is defined once: new screen flow, contract or module, auth or permissions, payment processing, schema migrations, deleting or rewriting stored data.
- qa pre-check only at T2; at T1 the developer writes the regression test first, failing.
- run-kit and lead shorter: lead context for a `feature` run 5,868 → 5,296 words.
- T1 has no pm and no TASKS.md (the lead writes the one ticket); T1 requirements ≤5 ACs and 200 words; PRODUCT.md is merged only at T2.
- Eval A/B against 0.33.0 (3 runs each, pass 100%): `/fix` −45% output tokens, −39% time; `/feature --small` −32%; `/feature` (T1) −51% tokens, −47% time, live `.team/` −75%. New case `cap-feature-t1`; the runner creates its `--out` folder and counts only live `.team/` files.

### Breaking

- `feature --small` no longer runs qa (developer → code-reviewer; the lead re-runs the tests). `fix` at T1 no longer runs a qa pre-check.

## 0.33.0 — 2026-11-21 (redesign P3a: artifacts + QA-Fix loop)

- **Item state is JSON:** `.team/items/<slug>.json` (step, next, round, findings, verdicts, questions, decisions) is the one source of truth; `.team/STATE.md` is generated from it by a hook on every save. `tools/team-state.mjs` validates (`check`) and renders (`render`).
- **QA-Fix loop rewritten** (`build-loop.js` 744 → ~310 lines): a finding is a failing test or a repro command, title ≤8 words; every blocker of a round is fixed in one batch (one developer per ticket); one round counter for review and qa fixes, cap 3; a finding reopened twice stops the loop (`stalled`). Removed: state witness, duplicate comparator, skeptics in the loop, approval audit log, history rows, the qa report-field minimum.
- **Reports only at T2:** below T2, qa, code-reviewer, security and debugger return verdict and findings in their result; no report file.
- **Spec rules enforced by hook** on every `.team/` write: no Revision/Round headings, lines ≤300 characters, a note above 4,000 words; specialists cannot write item state.
- **Compaction workflow** `technical-team:team-compact` (`workflows/compact.js`): owner rewrites, independent verifier checks against git and code, code checks the numbers.
- Lead context for a `feature` run: 9,508 → 5,868 words. T2 is payment processing, auth, migrations, rewriting stored data — calculation logic covered by tests stays T1.
- Eval A/B against 0.32.0 (3 runs each): pass 100%; `/fix` −40% output tokens, `.team/` 1,560 → 158 words; `/feature --small` −54% tokens, `.team/` ~1,000 → ~310 words.

### Breaking

- `build-loop.js`, `review.js`, `release.js` args: `state` / `tracker` / `profile` / `defaultProfile` / `scopeApproval` / `acceptDisputed` / `qaRetest` are gone; pass `item` (build-loop) or `items` (item JSON objects).
- Finding IDs are `F<n>` inside an item (`CART#F3` across items) instead of `CART-B<n>`; statuses are lower case (`open`, `fixed`, `verified`, `reopened`, `deferred`, `rejected`).

### Migration

- An item in flight under 0.32 (STATE.md § QA-Fix state + `reports/<slug>/findings.md`): on resume the lead writes one item JSON per open row (run-kit `workspace.md` § Item state) and archives `findings.md`. Rollback: pin 0.32.0.

### Deprecated

- none

### Removed

- none (public names and paths in `tests/contract.json` all still resolve; `.team/items/` is new)

## 0.32.0 — 2026-11-21 (redesign P0–P2)

- Eval harness: `plugins/team/evals/` (L1 routing/gate cases for `claude plugin eval`, capability cases + `cart-mini` fixture for `scripts/eval-run.mjs`), baseline results for 0.31.0.
- `scripts/measure.mjs`: static prompt-size and `.team/` metrics.
- Public contract frozen at 0.31.0 (`tests/contract.json`, `tests/contract.test.mjs`).
- **Shared specialist rules in one place:** the `## Rules` + Handoff block that was copied into 12 agents now lives in the `specialist-rules` skill, preloaded by each specialist through `skills:` (agents: 7,971 → 5,259 words).
- **Hooks (`hooks/hooks.json`, `hooks/guard.mjs`)** — apply to team specialist subagents only, never to the user's own session or the lead:
  - `git commit` / `git push` from a specialist is denied (was prose only).
  - A specialist report without its Handoff block (Status + Evidence) is refused at `SubagentHandback` and sent back once at `SubagentStop` (fixes PLUGIN-REPORT issue 8).

- Eval runner counts tokens from every session transcript (`claude -p` reported cost can leave out subagents).
- Behaviour unchanged against 0.31.0 on the eval suite (pass 100%, tokens within ±7%).

### Deprecated

- none

### Removed

- none
