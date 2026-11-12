---
description: "Build something: full feature (T2: BA elicitation → plan → G1 → delivery loop → docs), --plan to stop at G1 with no code, --small for a scoped change (T1: delivery loop only), --discover to let the BA work out what to build next (ranked backlog, no code)"
argument-hint: "<description> [--plan | --small | --discover]"
disable-model-invocation: true
---
# /technical-team:feature — feature (T2 · plan-only · T1)

## Running this command

Request: $ARGUMENTS

1. Empty request → ask in one short question what to build or change, then stop. Never guess.
2. If this session is the tech lead (`--agent technical-team:team-lead`), run the Pipeline below yourself. Otherwise call the Agent tool with `subagent_type: technical-team:team-lead` and this prompt:
```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/feature.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied in this conversation, or "none">
Read .team/STATE.md first.
```
   The team cannot see this conversation; "User-provided context" is the only way context reaches it.
3. Show the lead's report as written; do not do the team's work yourself. On `Chờ duyệt …`, stop and wait; never approve or choose for the user.
4. When the user answers, resume the same lead (SendMessage) or start a new Agent call: `Continue W-NNN (feature). User's answer (verbatim): <answer>. Read .team/STATE.md first.`

## Pipeline

_Run by the tech lead with the Lead manual rules (§1 tiers, §2 gates, §3 delivery loop, §4 brief, §7 specialists, §8–§9 reports)._
Other pipelines reuse the steps below by ID; keep the IDs stable.

### Mode

- No flag → **full** (T2): Planning P0–P5, then Delivery D1–D5. Gates G1–G4, security always.
- `--plan` (or "chỉ lên kế hoạch", "plan only") → **plan-only**: Planning P0–P5, then stop after G1. No code.
- `--small` (or "thay đổi nhỏ") → **small** (T1): steps S0–S5. Gates G2–G4, security only if triggered.
- `--discover` (or "nên làm gì tiếp", "chưa rõ cần gì", "what should we build") → **discover**: steps V0–V3, then the user picks. No code.

The same intent in words selects the mode as the flag does. Record the mode in `STATE.md`. The user may switch mode at any time with the same W-NNN. A plan-only item resumes at D1 when the user says to build it.

### Planning

- **P0** (lead) Open W-NNN with its slug, pipeline `feature (<mode>)`, gate `G1 pending`. No `.team/` → run the init script.
- **P1** (ba) Elicitation + spec with the `business-analysis` skill → `requirements/<slug>.md` and `PRODUCT.md`. Not ready → the ba returns a **round** (playback + questions with defaults); show it to the user as gate REQ, pass the answers back verbatim, repeat until ready-to-spec. "OK" accepts all defaults; "proceed" turns the rest into assumptions. Still blocked after 3 rounds → offer a spike, smaller scope or a user decision.
- **P1a** (designer) Only with user-facing UI: flows, screens, state matrix, visual system, copy → `frontend-design/<slug>.md` (design system changes noted for `_system.md`). Missing capabilities → the ba decides scope before P2.
- **P2** (architect) Design + implementation plan → `system-design/<slug>.md`, covering every AC. Decisions → ADRs with the numbers the lead gives in the brief; `ARCHITECTURE.md` index updated.
- **P2a** (dba / specialists) Review the draft when schema/data or their domain is touched (`design` hook). Blocking issue → one architect revision.
- **P3** (pm) Tickets → the item's section in `TASKS.md`, with disjoint files per parallel group.
- **P3a** (qa) Test plan + static review + RTM → `qa/<slug>.md`. Findings go back to their owner once before P4.
- **P4** (lead) Check requirements ↔ frontend design ↔ system design ↔ tickets ↔ test plan. Gaps → re-brief the owner.
- **P5** (lead) **G1**: gate report with goal, key ACs, assumptions, impact, UI flows, test plan and what the user must provide, chosen design and rejected options, tickets, risks, who joins later. Approved → record it; plan-only ends with a report, full goes to D1. Changes → brief the owner of the first changed file and redo from there. Rejected → work item cancelled; close it (Lead manual §6, from step 3).

### Discovery (`--discover`)

- **V0** (lead) Open W-NNN, pipeline `feature (discover)`, gate `DISCOVER pending`; put the user's words and evidence in the brief.
- **V1** (ba) Outcome → evidence → opportunities → options → ranked backlog in `PRODUCT.md` with the basis of each score, plus a recommendation. Unclear outcome → a REQ round first.
- **V2** (architect) Optional: rough size and risk of the top 1–3 options, answer only.
- **V3** (lead) DISCOVER gate report. The user picks → suggest `feature "<option>"` for each pick; "none" → `done`, backlog kept.

### Delivery

Input: the G1-approved tickets (or the subset a calling pipeline names).

- **D1** (developer / devops / dba / qa) Implement tickets in dependency order, parallel only with disjoint files (`execute` hook). The lead sets ticket status in `TASKS.md`. Check build/lint/test evidence and `git diff --stat`. Developer stuck → debugger.
- **D2** (code-reviewer + review specialists) Review the diff against plan and ACs → `reports/<slug>/review.md`. On the first D2, security reviews the same diff in parallel → `reports/<slug>/security.md`; record the files it saw. Blocking → D1.
- **D3** (qa) Quality verification per the test plan: tests, retest, regression, **live preview** on every in-scope platform, UI/UX verification, exploratory, findings, test summary → `qa/<slug>.md`. One qa run covers every platform. FAIL → D1. PASS = **G2**. "PASS pending design decision" → D3a.
- **D3a** (designer) Decide only qa's escalated UI/UX items: fix → D1; all accept = **G2**.
- **D4** (security) Review only the **delta** since its first pass; no change → nothing to run. Blocking → D1. Clean = **G3**.
- **D5** (writer) Docs as needed (writer says why if none); the lead marks tickets `done`. Then `STATE.md` → G4, final report, close the item (Lead manual §6: findings → follow-up tickets, owners merge, archive).

### Small (`--small`)

Needs a design decision (new component, contract change, migration, new screen or flow) → stop and propose full mode from P1.

- **S0** (lead → pm) Open W-NNN (T1) with its slug and write 2–5 expected-behaviour bullets in `STATE.md`. Cannot write them without guessing → one ba round through REQ. pm adds the one ticket `W-NNN-T1` to `TASKS.md`.
- **S1** (developer, devops for infra) Make the change (`execute` hook). Evidence of build/lint/tests.
- **S2m** (qa) Micro verify, only when the lead confirms every micro criterion (Lead manual §3): one qa run does review + tests → `qa/<slug>.md` (no `review.md`). FAIL → S1; "not micro" → S2; PASS = G2 + review → S5.
- **S2** (code-reviewer + specialists, security in parallel if triggered) Review the diff → `reports/<slug>/review.md` (+ `security.md`). Blocking → S1.
- **S3** (qa) Short test plan, tests, regression, live preview, UI/UX check, findings, test summary → `qa/<slug>.md`. FAIL → S1. PASS = **G2**. Pending design decision → S3a.
- **S3a** (designer) Decide escalated items only.
- **S4** (security) Delta review if triggered. Blocking → S1.
- **S5** (writer) **G3** on the final code; docs only if usage/API/operations changed → **G4**, final report, close the item (Lead manual §6).

### Rules

- Delivery loop per Lead manual §3: any code change restarts at the code-reviewer, no round limit, escalate when stalled. **Design escalation** goes straight to the architect.
- Non-blocking findings: fix now if cheap, otherwise defer with a reason.
- Hook points: `design` P2a, `execute` D1/S1, `review` D2/S2, `test` D3/S3.
- One file, one writer (Lead manual §5): lead `STATE.md` + ticket status, ba `requirements/` + `PRODUCT.md`, designer `frontend-design/`, architect `system-design/` + `ARCHITECTURE.md` + `adr/`, pm `TASKS.md`, qa `qa/`, code-reviewer / security `reports/<slug>/`. devops writes no `.team/` file.
- Ends after G4 and closing (plan-only: after G1, the item stays open until built or cancelled; discover: after the pick). A stalled loop pauses for the user but never closes as done.
