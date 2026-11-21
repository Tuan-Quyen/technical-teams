# run-kit §6 · Workflow steps

How every command runs a step through the Workflow tool. The command gives the opt-in, the workflow name, the `args` and any command-specific routing; the rest is here.

## Run

- **Run** — write every agent's §3 brief yourself, then set the item's STATE row (step `<n> (workflow)`, status `running`) and call `Workflow` with `name: 'technical-team:team-…'` and the command's `args`. Only if the name is not found: Read `${CLAUDE_PLUGIN_ROOT}/workflows/<file>.js` (the file the command names) and pass its text as `script` with the same args.
- **Task list** — one item per workflow phase in place of the items for the steps it covers (build-loop: `State`, `Plan` (only with a `qaPlanBrief`), `Build`, `Review`, `Test`, `Docs`); the command's own items otherwise.
- **While it runs** — tell the user it runs in the background and the result arrives as a task notification. The workflow cannot ask the user; the lead does.
- **Result** — update STATE and the task list, then route by `status`:

## Route the result

| Status | Do |
|---|---|
| `done` | next step of the command; report `review.disputed` findings for their owners to decide |
| `BLOCKED_PENDING_USER_DECISION` | build-loop: round 3 used and qa blockers remain (also on entry: an inspection review at most, nothing fixed). Write `state` and `tracker`, then follow §3 *More than 3 rounds*: the top-level session asks the user with `decision` (blockers, evidence). Approved → one round inline, never a workflow re-run; defer/reject → set it in the tracker; else the item stays blocked. Never report it as PASS |
| `stuck` | build-loop: a gate failed with no actionable finding → ask the user (lead §5); plan-tickets: show `tickets` and `issues` (`groups` / `milestones` empty) and decide with the user |
| `stopped` | route every `needsUser` entry below (`stoppedAt` names the stage); review and release have no `status`: route their `needsUser` the same way |

| `needsUser` status | Do |
|---|---|
| `blocked`, `needs-input` | the §5 table |
| `missing` | agent died or was skipped, no result → re-spawn that agent once; still missing → ask the user. From `state-witness`: nothing ran; re-run the same call |
| `no-verdict` | reviewer or qa returned no PASS/FAIL → treat as `blocked`, with its handoff |
| `disputed` | every blocking finding of a failing reviewer was refuted: show them and `remaining` (not auto-fixed); the user decides. Accepted → re-run with `acceptDisputed: [finding IDs]` and `startAt: "qa"` (`"review"` if other findings remain) |
| `spec-issues` | qa pre-check found blocking spec issues or returned FAIL; nothing was built. Route each finding to its owner (ba, designer, architect) or the user. Resolved → re-run with `startAt: "plan"`; the user accepts them as-is → re-run with `startAt: "build"` and the answer in `context` |
| `state-regressed` | qa.md, findings.md, the STATE.md row or git history showed a higher round or bug number (`qaMdBefore`, `filesShow`, `filesLastId`) than the state passed in (`canonical`, `lastId`): the state went back. Nothing ran. Find the right row (git history of `.team/STATE.md`, the last results) and restore it; never lower qa.md to match |
| `state-mismatch` | qa wrote another round than the one given (`canonical`, `reported`): STATE.md wins; send qa back to correct `qa.md` line 1, re-run with `startAt: "qa"` |
| `report-incomplete` | qa's `report` lacks fields its profile and mode require (`missing`): back to qa; re-run with `startAt: "qa"` |
| `scope-change` | qa planned or ran scope past the approved plan (`expansion`, `exploratory`): the lead approves it with the risk named → re-run with `scopeApproval`, or refuses → qa stays in scope |
| `retest-incomplete` | a gate did not report findings waiting for retest (`findings`): back to that gate; nothing counts as fixed |
| `blocked-item-overlap` | another item (`items`) is blocked at the cap with open blockers in this call's files: nothing ran. Show both to the user; never start the work under a new slug to get past the cap |
| `item-missing` | release.js: STATE.md has an item with open blockers that `items` left out → NO-GO; add it to `items` |
| `qa-pending` | a call without `qaBrief` on an item qa has tested: nothing passes it. Re-run with the `qaBrief` (`startAt: "qa"`) |
| `open-blockers` | review.js / release.js `items`: the item has unresolved blocking entries; the verdict does not move it (release: NO-GO) |
| `unresolved-blocking` | the loop ended with blocking entries no gate verified (`findings`): retest them (`startAt: "qa"` or `"review"`), or the lead defers, rejects or unblocks them in the tracker. Never report done |
| `review-limit` | 3 review-fix cycles in this QA-Fix round (`state.reviewFixes`): show the review findings to the user; the next round of review fixes only after a qa FAIL starts a new QA-Fix round or the user decides |
| `invalid-findings` | qa claimed blocking findings without the required fields, basis or severity: send them back to qa with each `reason`; nothing was fixed or passed. Re-run with `startAt: "qa"`, `qaRetest: true` |
| `no-valid-blocking` | qa returned FAIL but no finding is blocking (non-blocking and separate ones listed): the lead fixes, defers (tracker `DEFERRED`) or asks qa again; nothing was fixed. Re-run with `startAt: "qa"`, `qaRetest: true` |
| `profile-change` | qa tested (or planned) at another profile than `approved`: the lead approves the change with the risk named → re-run with the new `profile` (`startAt` from `stoppedAt`), or keeps it → re-run with the old one |
| `unowned`, `unsafe-path` | no fixer was spawned, nothing fixed: findings whose file matches no ticket's `files` (a qa finding owned by ba, designer or architect lands here too: route it to that owner), or with an absolute, `..`, `.git/` or `.claude/` path. Show them, ask who owns them; never widen a ticket's `files` or add a ticket without the answer. Re-run with `startAt: "review"` and the updated `groups` |

## Write back and re-run

- **Every result** — write `state` (fixRounds, lastId, reviewFixes) to the item's STATE.md § QA-Fix state row, `tracker` goes to `findings.md`, `profile` to the STATE notes; every later call passes `state`, `tracker` and `profile` back. A workflow that ended with no result (killed, crashed): read its log; a `fix:` agent that started under a qa FAIL counts as a started round.
- **Re-run (build-loop)** — call again with the **full** `groups` (fix routing needs them), `state`, `tracker` and `profile` from the last result, the same `qaPlanBrief` (developer briefs keep the RTM line; pre-check runs only at `startAt: "plan"`) and the user's answer verbatim in `context`; resume from `stoppedAt`:
  - `Plan` → `startAt: "plan"` (or `"build"` when the user accepted the spec issues).
  - `Build`, round 0 → `startAt: "build"`, `fromGroup` = index (from 0) of the group holding the stopped ticket named in `needsUser`; that group re-runs whole, earlier groups are not rebuilt.
  - `Build`, round ≥ 1 (a fix stopped) or `Review` → `startAt: "review"`.
  - `Test` → `startAt: "qa"`. `Docs` → `startAt: "qa"` with the `qaBrief` (qa re-checks, then the writer runs again; without it an item qa has tested ends `qa-pending`).
  - qa already ran for the item (its report has an execution round) → add `qaRetest: true`, so the first qa run of the re-run is a retest, not a first run.
  - A re-run restarts only the per-call loop counter (`rounds`); everything in `state` and the bug IDs in `tracker` carry on.
