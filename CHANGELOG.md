# Changelog — technical-team plugin

Format: each release lists **Breaking**, **Deprecated**, **Removed**, **Migration** when they apply. Public names and paths are pinned in `tests/contract.json`.

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
