# Changelog — technical-team plugin

Format: each release lists **Breaking**, **Deprecated**, **Removed**, **Migration** when they apply. Public names and paths are pinned in `tests/contract.json`.

## Unreleased (retrospect: short report, current version only)

- **Report fits in a prompt, proposals by group**: `retrospect.md` is ≤ 600 words without its Evidence list — Sample line, Verdict (≤ 3 bullets), then **Agents · Skills · Commands** ("none" for an empty group), Since the last retro, Not acted on, Evidence (`[E<n>]` → full ref). The retrospector works as the AI agent engineer who improves the plugin each version: each proposal is new / update / delete with four headings — *Why new / update / delete?* (the problem, with refs), *Improves which part?*, *Workflow* (who does what after the change), *Committed improvement* (a Follow-up metric, now → target). New and update come with the full file in its skeleton under `drafts/<agents|skills|commands>/`; update and delete with the exact diff in `changes.md`; delete or rename names its contract and README entries. Every new needs ≥ 2 real examples from ≥ 2 sessions.
- **Current version only**: the miner keeps a session only if its cache path shows the audited version, or it has no released version (a `--plugin-dir` run) and started after that version did (`--since`, default the `plugin.json` write time). Older versions are excluded and counted; the `old-versions` signal is gone. `--all-versions` keeps them for a comparison only.
- **Version over version**: the miner reads the previous digest beside `--out` and adds Last / Δ columns to Follow-up metrics; the retrospector reports whether each change of the last retro was applied and moved its metric (applied with no effect → candidate to revert).

## 0.40.0 — 2026-11-23 (orchestrator, pm as Scrum Master, one home per rule)

### Breaking

- **`team-lead` is now `team-orchestrator`** (agent file `agents/team-orchestrator.md`, main-agent call `claude --agent technical-team:team-orchestrator`). The role is unchanged: classify, pick the pipeline, brief, check handoffs, keep the item state. All prompts, workflows, hooks and tools say "orchestrator".
- `TASKS.md` columns change: `Size` → `Est (d)` + `Agent time` + `Sprint`; new sections Sprints, Risks, Status report. `plan-tickets` requires an `estimate` (days of real work, 0 < d ≤ 2) per ticket: new code-check rules `estimate` and `estimate-split`.

### Added

- **`team-retrospector`** (purple, opus; no `Edit`) and the **`retrospect` method skill** (after the squad-audit playbook): `/technical-team:retrospect` is one retrospector spawn plus the relay. The skill holds the method — sources in order (transcripts, `.team/` artifacts, git, definitions), signal thresholds, evidence rules ("Data shows" / "Inference", confidence per section, `--show` before citing), smallest change first, self-critique — and the report is written in the user's language to `.team/retrospect/<YYYY-MM-DD>/retrospect.md` with `evidence/` (gitignored) and `drafts/`.
- `migrate-ids.mjs` moved to `skills/run-kit/scripts/` (its only user is run-kit); `tools/` keeps only the shared `team-state.mjs`.
- The miner moved to `skills/retrospect/scripts/retro-miner.mjs` and now also counts: a work inventory of every prompt (by type, with or without the team), corrections right after a team piece, instructions repeated in ≥3 sessions, similar openings, long prompts, pasted Handoffs, `Next:` naming no role, non-standard `Status:`, skipped tests or review, adoption since first use, and follow-up metrics to re-measure. `--show <ref>` prints an item's context; `--exclude-project`; workflow `StructuredOutput` handoffs read; `journal.jsonl` no longer counted as a run; probe sessions and fork-duplicated prompts left out; a `--plugin-dir` run shows version `dev`.
- **`team-pm` as PM / Scrum Master**: an item is an epic, broken into tickets with estimates in days of real work for a human engineer (an assumption, 0.5-day steps), dependencies and an owner role; time-boxed sprints (default 1 week · 5d) with capacity, committed and done days; risks (`R<n>`, with source) and blockers; `Agent time` only from measured time the orchestrator passes in status briefs. A sprint never holds back a pipeline step.
- **`technical-planning` skill renamed `plan`** and now also holds sprint planning (orchestrator for `standup plan`, pm for tickets, a sprint plan, standup or close): the steps from a goal or epic to a committed sprint and who takes part in each — user sets goal and capacity and commits; ba specs a new epic with Must / Should / Could; qa's P1/P2 rank issues; architect resolves unknowns (or a spike ticket); pm breaks down, fills capacity by priority then dependency, lists what did not fit and the critical path. Sprints, risks, status updates and the standup report moved from `references/tickets.md` to `references/sprint.md`.
- **`/technical-team:standup [close | plan [<weeks> <days>] [<goal or epic>]]`**: one pm spawn writes the latest Status report on the board (done, next, blockers, risks, sprint burn); `close` runs the sprint review and opens the next sprint. Only on request.
- `.team/TASKS.md` template → **Task board**. `STATE.md` stays the control view of how the team is running.
- **The orchestrator coordinates, never decides** (run-kit §5 *Who decides*): pm decides ticket done / blocked, a finding's owner ticket and when an item with tickets closes; the last gate (qa; code-reviewer for T0, infra) closes an item without tickets; finders own severity, blocking and retest scope; qa owns every `ISSUES.md` row and status (triage imports, test failures, an item's leftovers); ba decides what goes into `PRODUCT.md`; defer / reject is the user's word only. The orchestrator records verdicts verbatim and sends a FAIL without a test back to its gate. `review` no longer writes `ISSUES.md` rows; it offers `triage`.

### Changed — one document format

- **Every prompt file has the skeleton of its type** (CLAUDE.md § Document format, checked by `tests/structure.test.mjs`): agents `Inputs · Before you start · Work · Done when · Stop and report · Writes · Never`; commands `When to use · Steps` (a `# · Step · Agent · Gate / verify` table) `· Workflow · Done when`; method skills `When to load · Principles · Method · Done when · References`; each reference opens with `> Used by · Read when`. Content kept; it moved into its section, and every command and agent gained an explicit **Done when**.
- **Four working principles in `specialist-rules`** (from forrestchang/andrej-karpathy-skills: think before you work, simplicity first, surgical changes, goal-driven), each a bold rule, bullets and a `Test:` line; agents no longer repeat shared rules in a `## Rules` footer.
- run-kit §5 *Who decides* moved to `references/roles.md` § Who decides (ownership of checks and calls in one reference). test-process verdict `vướng` / `cần quyết định` → `blocked` / `needs-input`, the Handoff statuses.
- Size: agents 4,585 → 5,208 words, commands 3,725 → 4,710, skills 13,575 → 14,683 (the added sections, tables and Done when lines).

### Changed — one home per rule

- **run-kit §2 *Pipelines*** is the single place for routing and the rules every command shares: the request → command table (moved from the orchestrator's §2), tiers T0/T1/T2, issue IDs, the task list, the **Workflow opt-in** sentence, check-only close (`review`, `test`) and "never commit, push, tag or deploy unless asked". Commands keep only their own steps (−21% words across the 10 commands besides `run`: 4,570 → 3,613); the orchestrator's §2 now points at the table.
- Readable IDs moved from run-kit core to `references/workspace.md` § IDs people can read.
- Skill descriptions (loaded in every session) cut from 104–115 to 41–59 words.
- **Method skills slimmed (13,088 → 8,797 words)**, each rule kept once: `test-process` 6,061 → 3,155 (`process.md`, `techniques.md`, `quality-checklist.md` folded into SKILL.md § T2 test plan and one `references/test-design.md`; the finding lifecycle now points at run-kit `qa-loop.md`), `business-analysis` 2,582 → 1,818, `development-process` 2,212 → 1,819 (`unit-testing.md` folded into `implementation.md`), `technical-planning` 2,233 → 2,005 (`adr.md` folded into `solution-design.md`). Mermaid diagrams in prompts replaced by text.
- A finding no longer has a priority (P0–P3): `blocking` decides what an item fixes; priority stays on `ISSUES.md` rows (P1–P3), matching the template. The dangling `feature --discover` flag (never implemented) is gone from `business-analysis`; discovery starts from the request.
- **Hook reduced to the rules that need code**: specialists never `git commit`/`push`, reports carry the Handoff (Status + Evidence), and saving `.team/items/*.json` regenerates `STATE.md`. Dropped: the pre-write deny on `.team/items/` / `STATE.md`, item-schema blocking and the spec-rule checks on `.team/**/*.md` (still in specialist-rules, checked in code by `compact`; check an item by hand with `team-state.mjs check`).

## 0.39.0 — 2026-11-22 (the team looks back at its own sessions)

- **`/technical-team:retrospect [days]`** (7–30, default 14): `tools/retro-miner.mjs` reads the local Claude Code transcripts (`~/.claude/projects`, CLI and desktop, subagent and workflow runs included), keeps the sessions that used the plugin and writes a digest of signals — usage against what the plugin ships, cost and active time per specialist, guard firings, handoffs blocked / needs-input / missing, tool errors and permission denials per agent, re-spawns, the lead editing code itself, non-team agents, repeated shell commands, compactions, interrupts, plugin version per session. Every signal carries refs (`<project>/<session>.jsonl:L<n>`) and redacted snippets.
- The lead turns the digest into ranked recommendations in `.team/retrospect/<date>.md` (template `core/RETROSPECT.md`): component, add / remove / merge / edit, evidence (≥2 refs from ≥2 sessions, else a hypothesis), the proposed text, impact and contract note. No item, no spawn, no edit to the plugin; you pick what to apply.
- Local only: no network; sessions in this plugin repo itself are left out unless `--include-dev`; a project copied with its transcripts counts once.

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
