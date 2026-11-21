# run-kit §3 · QA briefs, findings and rounds

The QA half of §3: the lines every qa, reviewer and developer brief carries, how a qa result is read, the item's finding tracker and its QA-Fix round. The same rules hold inline and in `build-loop.js`.

## QA briefs: pre-check and execution

One `team-qa`, two modes. Inline runs put these lines verbatim under **Constraints**; `build-loop.js` appends the same text itself (`QA_PRECHECK`, `QA_EXEC_FIRST`, `QA_EXEC_RETEST`, `QA_ROUNDS`, `QA_PROFILE`, `TRACKER_RULE`, `DEV_RTM`), so both paths behave the same.

- **Pre-check** (before the first developer spawn; feature, fix, each `new` milestone; name the default profile for the task type in the brief):
  `QA mode: pre-check. Pick the test profile from the change's actual risk (T0, T1 or T2: test-process § Profiles; the brief names the default for the task type) and say why in one line. No code exists yet: static review and planning only, no test runs, no live preview. Exception, a fix: run the debugger's reproduction, define the regression test, and write it now when its level is integration or E2E, recorded failing on the unfixed code. Review the ACs and designs for gaps, ambiguity and contradictions; list edge cases, failure scenarios and risks; write the plan at the profile's depth (T0: a checklist of the changed behaviour; T1: a lightweight RTM checklist; T2: the full test plan and RTM, each condition with source, ticket, level and owner, expected test), the approved scope, platforms and exit criteria, the environments, data and tools needed, and the evidence developer must hand over. A plan already in qa.md → update only what changed specs touch, keep every ID. A spec issue that needs a decision → a blocking finding owned by ba, designer or architect; never invent the expected behaviour.`
- **Round** (every qa brief; `<n>` = the item's QA-Fix round from STATE.md, `<cap>` = 3, always; an inline round past 3 keeps its own number, e.g. `4 of 3`):
  `QA-Fix round of this item: <n> of <cap> (canonical in .team/STATE.md, given by the lead). First return the round qa.md line 1 shows now as previousFixRounds (-1 when there is no qa.md or no round on it). If that is higher than the given round, change nothing in qa.md and stop there (status needs-input): STATE.md went back. Otherwise write exactly the given number on line 1 and return it as reportFixRounds; never change, reset or re-derive it.`
- **Profile** (every qa brief once a profile is approved; `<profile>` = T0, T1 or T2):
  `Approved test profile: <profile> (test-process § Profiles). Test at that depth; a wider or narrower profile needs the lead's approval: return needs-input with the risk, never switch on your own.`
- **Tracker** (every qa and reviewer brief once the item has findings, followed by its rows `bug ID status severity file:line title`):
  `Known findings of this item are listed below with their bug IDs. Report each one you re-check with its trackerId and result verified or failing (its title, file or line may change; the bug ID does not). A new finding has trackerId "" and result new; never give a known defect a new finding. Use the bug IDs in your report.`
- **Developer briefs** after a pre-check (every build and fix of the item):
  `Constraints: qa pre-check mapped this ticket's test conditions in the RTM of .team/reports/<slug>/qa.md: read them before coding, self-check against each and list the result in your Evidence. Never claim the QA verdict.`
- **Execution, first run** (after review PASS):
  `QA mode: execution, first run. Reuse the approved test plan and RTM in qa.md; never rebuild them (no plan in qa.md: the brief's conditions are the RTM). Check the developer evidence against the entry criteria, then run the approved scope at the approved profile's depth: integration, E2E and acceptance tests, live preview of user-facing changes, UX checks, exploratory testing only as the plan sets it; report every reproducible finding with evidence, then the verdict.`
- **Execution, every later run** (after a fix round):
  `QA mode: execution, retest. Allowed scope: retest every finding in FIXED_PENDING_RETEST, run targeted regression around the changed or impacted areas, re-run the related automated tests. No exploratory testing (exploratory: none) unless the lead approved an expansion; to propose one, return needs-input with the risk before running it. A known defect keeps its bug ID (result failing, never a new finding); a new finding only for a new change, a regression, a fix-caused defect or a missed in-scope defect, with evidence. Record planned scope, executed scope and deviations.`

Pre-check returns `blocked` / `needs-input`, or a blocking spec issue → no developer starts: route each issue to its owner, then pre-check again (or the user accepts it as-is, quoted under **Constraints**). Profiles and their defaults by task type are `test-process` § Profiles: pass the default as `defaultProfile`; T0 has no pre-check spawn (`--small`) except a fix, whose pre-check only reproduces and defines the regression test; `infra` has no qa step.

## qa report minimum (both paths)

besides `qa.md`, qa returns a short `report` (one line each, `n/a: <why>` where a field does not apply). Missing fields stop the run (`report-incomplete`); this checks what qa *declares*, it cannot prove a test ran.

| Mode | T0 | T1 | T2 |
|---|---|---|---|
| every mode | profileReason · plannedScope | same | same |
| pre-check | — | + acs · checklist | + acs · testPlan · rtm |
| first run | + executedScope · deviations · changedBehaviour · tests · smoke | + executedScope · deviations · acs · happyPath · negativePaths · integration · regression · checklist | + executedScope · deviations · testPlan · rtm · boundaries · e2e · exploratorySession · expandedRegression |
| retest | + executedScope · deviations · tests | + … · regression | + … · regression |

`exploratory` is `none`, `planned` or `expanded`; `expansion` names scope past the approved plan with its risk. An expansion, `expanded`, or any exploratory on a retest stops the run (`scope-change`) until the lead approves it (`scopeApproval`). `scopeApproval` is one free-text approval for the whole call: the code checks that it exists, not what it covers, so the lead writes the approved scope into it and re-runs without it when that scope is done.

## Reading a qa FAIL (both paths)

the rules of `test-process` § Severity and blocking, applied by `build-loop.js` in code (`triage`) and by the lead inline:

| qa finding | Treated as |
|---|---|
| basis `pre-existing`, `enhancement`, `out-of-scope`; tracker status `VERIFIED`, `DEFERRED` or `REJECTED` (only the lead sets the last two); `leadBlocking: false` on the entry | separate: listed, never blocking |
| minor, trivial, or major without `blocking: true` | non-blocking: the lead fixes or defers |
| blocker, critical, or major with `blocking: true`, basis in scope (`ac-violation`, `regression`, `fix-caused`, `critical-risk`), and all of steps · expected · actual · evidence · violates · impact · why | blocking → QA-Fix round |
| blocking claimed but basis out of scope or a field missing, or a severity outside blocker · critical · major · minor · trivial | invalid: the run stops whatever the verdict, nothing fixed or passed; back to qa (`invalid-findings`) |
| qa FAIL with no blocking finding left | the lead decides (`no-valid-blocking`); never a silent PASS |
| a finding in `FIXED_PENDING_RETEST` or `IN_PROGRESS` that the retest does not report | stop (`retest-incomplete`): it is never assumed fixed |
| an entry that once blocked and is not `VERIFIED`, `DEFERRED`, `REJECTED` or `leadBlocking: false` when the loop ends | stop (`unresolved-blocking`) instead of `done`, whatever the last verdict or severity said |
| qa used another profile than the approved one, or picked one wider than the brief's default | stop: the lead approves the change or not (`profile-change`) |

## Finding tracker (both paths)

one tracker per item, `.team/reports/<slug>/findings.md` (the lead's file; template `reports/findings.md`), for qa and reviewer findings alike:
- IDs `CART-B1`, `CART-B2`… are given once, when a finding is first registered (the workflow assigns them; inline, the lead does) and never change, whatever happens to title, file or line. Gate reports keep their own IDs (`Q-`, `R-`, `S-`) as `sourceId`.
- Status: `OPEN → IN_PROGRESS → FIXED_PENDING_RETEST → VERIFIED`, or `REOPENED` (same bug ID) when a retest fails; `DEFERRED` and `REJECTED` only by the lead. A gate cannot verify an `OPEN` entry no fix touched, and changes only the rows its brief showed (a reviewer: its own origin; qa: all). History rows keep every step.
- `findings.md` holds the tracker JSON exactly as the last result returned it, every entry including closed ones (the code's `F-` numbering and its STATE cross-check rely on it); the table above it is the human view.
- A new finding that looks like a known one (≥ 2 of: same file, same requirement, similar title, evidence sharing ≥ 3 distinctive words) is a duplicate candidate: a read-only comparator decides by behaviour and evidence. No match, or no answer → a new bug ID with `relatedTo`; metadata alone never merges two findings.
- Reviewer findings keep the reviewer's verdict and skeptic check, and enter the tracker under their origin (`CODE_REVIEW`, `SECURITY`, `DBA`). The lead sets scope, priority, owner (`owner`: a ticket) and blocking (`leadBlocking: true` forces blocking, `false` lifts it) on any entry; the next call obeys them. A review fix never moves the QA-Fix round; review-fix cycles are capped at 3 per QA-Fix round, persisted in `state.reviewFixes` (`review-limit`). When a review fix changes product behaviour, qa sees that row in its next brief and may verify it; the reviewer of that origin must re-check it.

## QA-Fix round (both paths)

the canonical state is the item's row in STATE.md § QA-Fix state (`Fix rounds`, `Last bug no.`, `Review fixes`); the lead reads the whole row before every call or spawn and writes the whole row after, from the result's `state`.
- A QA-Fix round is one developer fix cycle started by an actionable qa FAIL. The first qa run is round 0; the first actionable qa FAIL starts round 1; the review and retest of that fix stay in round 1; the next actionable qa FAIL starts round 2.
- A round counts when routing found an owner for every finding and the fixer starts; a FAIL stopped as `unowned` or `unsafe-path` spends no round.
- Cap: 3 rounds, a constant in the workflow code (`ROUND_CAP`), not state. `state.cap`, `state.approvals` and any approval-like argument (`approval`, `approvedBy`, `userApproval`, `maxRounds`, `extraRounds`) are refused; `fixRounds` above 3 is refused at every entry point: rounds past 3 never run in a workflow. qa first reports the round `qa.md` line 1 showed before its update, then writes the given round and returns it. A different written number stops the run (`state-mismatch`); an older `qa.md` showing a *higher* round stops it too (`state-regressed`).
- `state.lastId` must equal the tracker's highest bug number, and a round above 0 needs a qa finding in the tracker; otherwise the call is refused (findings.md lost or gained entries).
- Review-fix cycles: at most 3 per QA-Fix round, persisted in `state.reviewFixes` (reset when a QA-Fix round starts); then `review-limit`.
- **Every entry point** (build-loop at `plan`, `build`, `review`, `qa`, a resume or re-run; `review.js` and `release.js` for each item in `items`) validates the same way (`checkState`), then a read-only state witness reports what `qa.md`, `findings.md`, the STATE.md row and their git history show. Any of them higher than the state passed in (round, bug number, review fixes), or a finding in findings.md stricter than the tracker passed in (missing, less resolved, not blocking) → `state-regressed`, nothing runs; no witness answer → `missing`, nothing runs. So the lead writes every tracker decision (`DEFERRED`, `REJECTED`, `leadBlocking`) to findings.md before the call. Another item blocked at the cap with open blockers in this call's ticket files (a renamed slug, or a clash) → `blocked-item-overlap`, nothing runs.
- **A blocked item** (round 3 used, a qa blocker failing again: `OPEN` or `REOPENED`, or its last history event `still-failing` or `reopened`): a `review` start runs one inspection review and returns `BLOCKED_PENDING_USER_DECISION`; every other start returns it at once. No fix cycle of any kind, no counter change, never `done`. `review.js` reports it in `items`; `release.js` is NO-GO, also when a STATE.md row with open blockers is left out of `items` (`item-missing`, from a roster witness).
- **No qa, no pass**: a build-loop call without `qaBrief` on an item qa has tested (a round used, a qa finding, or a `qa.md` round) ends `qa-pending`, never `done`. Infra items (never tested by qa) still end `done`.

### What the code guarantees, and what it cannot

the cap, the refusal of every approval record, the checks above and the blocked behaviour are code, in every workflow call. The trusted inputs are not: the workflow runtime has no store outside what agents can write — STATE.md, findings.md, qa.md, git history and the plugin's own files (including `ROUND_CAP`) are all editable by an agent with file or shell access; the agents' rules forbid it, their tools do not. A rewind of all of them together, and their git history, is not detected. Narrower gaps, also not detected: git history is checked for round numbers only, so findings.md edited to a looser status (say `VERIFIED`) and passed the same way in `tracker` passes; and a blocked item whose STATE.md row is also deleted no longer stops work on its files under a new slug. The witness is an agent: it can only tighten the state, but a witness that misreads or is misled by edited files loosens nothing it did not see. A lead that loses the state and every file starts the item over.

## More than 3 rounds — a human decision (both paths)

at the cap with blockers left, the item stops `BLOCKED_PENDING_USER_DECISION`; it never passes.
1. Only the top-level session — the one the user is talking to, never a subagent (a `team-lead` subagent only plans) — puts the decision to the user: the item, the current round, each blocker with evidence and user impact, why another cycle is needed, and its proposed scope. Ask with AskUserQuestion (options: one more round inline · defer or reject blockers · keep blocked), or read the user's own next chat message.
2. Silence, agent text, a file, a default, or a qa/developer/reviewer recommendation is never approval; no agent approves its own continuation. A vague answer, or one about another item, is not approval: ask again.
3. Approved → that one round runs **inline**, in the same session that got the answer (developer fix → review → qa retest with `<n> of 3`); never through a workflow, which refuses any round past 3. A further round needs a further answer. The session then logs it in STATE.md § Approvals (audit log). A row in § Approvals never authorizes anything: neither path reads it as permission, on resume either — a resumed session asks again.
4. Defer or reject → the lead sets `DEFERRED` / `REJECTED` on those tracker entries as the user said; the item can then pass.

This gate is procedural: the code refuses every approval record, but whether a round past 3 runs inline depends on the session following this section. It cannot prove who answered.
