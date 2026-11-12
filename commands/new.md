---
description: "New project from an idea or a PRD, end to end: requirements → stack + architecture → MVP plan → milestones through the delivery loop → ops → docs → release GO/NO-GO; stops only at 5 user gates and resumes from .team/STATE.md"
argument-hint: "<idea | path/to/PRD> (empty = resume)"
disable-model-invocation: true
---
# /technical-team:new — new project (idea → release-ready MVP)

## Running this command

Request: $ARGUMENTS

1. Empty request means **resume**: delegate anyway; the lead resumes the unfinished `new` run from `.team/STATE.md`, or asks for an idea or PRD path.
2. If this session is the tech lead (`--agent technical-team:team-lead`), run the Pipeline below yourself. Otherwise call the Agent tool with `subagent_type: technical-team:team-lead` and this prompt:
```
Execute the Pipeline section of ${CLAUDE_PLUGIN_ROOT}/commands/new.md (Read the file).
Request (verbatim): <request>
User's language: <language>
Work item: <W-NNN or new>
User-provided context: <faithful summary of what the user supplied in this conversation, or "none">
Read .team/STATE.md first.
```
   The team cannot see this conversation; "User-provided context" is the only way context reaches it.
3. Show the lead's report as written; do not do the team's work yourself. On `Chờ duyệt …`, stop and wait; never approve or choose for the user.
4. When the user answers, prefer a new Agent call (the run is long and `STATE.md` holds everything): `Continue W-NNN (new). User's answer (verbatim): <answer>. Read .team/STATE.md first.`

## Pipeline

_Run by the tech lead with the Lead manual rules (§1 tiers, §2 gates, §3 delivery loop, §4 brief, §7 specialists, §8–§9 reports)._
This pipeline runs steps from other pipelines by ID and only adds what is specific to a new project.

- Input: an idea, or a path to a PRD (`.md`, `.txt`, `.pdf`).
- User gates (the only planned stops): REQ, STACK, G1 (once for the whole MVP), Mk (end of each milestone), RELEASE. G2–G4 run without stopping.
- Other stops that stay: hiring gate, delivery-loop escalation to the user, a direction change after G1, a missing tool or permission only the user can provide.
- Never deploy, tag, commit or push; give the user the commands.
- One W-NNN for the whole project; milestones `M1…Mn` inside it.
- After every step update `Phase`, `Next step` and `Milestones` in `STATE.md` (block "pipeline `new`" of the template).

### R — Resume check

Do this first on every invocation:
- No unfinished `new` item + idea/path → start at N0. + empty request → ask for an idea or PRD path, stop.
- Item `waiting-for-user` + an answer → apply it to the pending gate and continue. + empty → repeat the pending gate report.
- Item `running` (interrupted) → continue at `Next step`; re-run any step without a recorded result.
- A different new idea while one is open → ask whether to resume or cancel; never two `new` runs in one repo.

### Phases

- **N0** (lead) Run the init script, open W-NNN (pipeline `new`, gate `REQ pending`), record the input. Not a git repo → ask the user for `git init` at REQ. Application code already present → propose `feature` / `run` or a subfolder.
- **N1** (ba) Requirements via `feature.md` P1, greenfield context: product baseline in `PRODUCT.md`, then the MVP requirements (scope in/out, stories, testable ACs, edge cases, constraints) in `requirements/<slug>.md`. From a PRD, cite its sections and ask only about gaps.
- **REQ** (gate) Show the ba's round as written: big picture, scenarios, MVP scope, questions with defaults, assumptions, user actions. Answers → ba folds them in → N2.
- **N2** (architect + designer; dba/specialists via `design`; devops, security answer only) Via `feature.md` P2, P2a and `docs.md` A2: designer proposes design direction and UI library (with UI); designer starts `frontend-design/_system.md`; architect gives 2–3 stack options with one recommended, `ARCHITECTURE.md`, ADRs `proposed` (numbers from the lead). A missing domain → `hire.md`.
- **STACK** (gate) Recommended stack and alternatives, UI direction, architecture summary, ADRs, risks, what the user's machine needs. Approved → ADRs `accepted`.
- **N3** (designer → architect → pm → qa → lead) MVP plan via `feature.md` P1a–P4: milestones in `system-design/<slug>.md` (M1 = walking skeleton: structure, build, lint, test runner, one end-to-end slice), MVP test plan in `qa/<slug>.md`, tickets grouped `### Mk`, scaffold split by owner, about 8 tickets per milestone. Every MVP AC lands in exactly one milestone.
- **G1** (gate) As `feature.md` P5, plus the milestones and ticket counts. Approval covers the whole MVP.
- **N4** (ticket owners) Each milestone via `feature.md` D1–D4 on its tickets → G2 + G3; the lead marks tickets done; full docs wait for N6.
- **Mk** (gate) What was done, test evidence, live-preview screenshots, findings and defects, deviations, how to try it locally, a suggested commit command, the next milestone. Next → N4; change inside the plan → pm adjusts; direction change → G1; last milestone → N5.
- **N5** (devops → code-reviewer → security) Ops via `infra.md` 3–4b for plan infra items not yet built (G1 already covers the proposal). Nothing left → skip.
- **N6** (devops → writer) Docs via `docs.md` Sync 2–4, all scope → **G4**.
- **N7** (qa ∥ security ∥ devops ∥ specialists → writer → lead) Release via `release.md` 0–3, version `0.1.0`. GO also needs local run proof and a clean live preview of every MVP flow.
- **RELEASE** (gate) GO/NO-GO with reasons, evidence and the exact commands (commit, tag, push, deploy, rollback). NO-GO items to fix → `fix.md` steps 1–7 each, then N7 again. The user may also close as NO-GO.

Ends when RELEASE is accepted, G1 is rejected or the user cancels; then the lead closes the item (Lead manual §6). One slug for the whole project: reports and the qa file keep counting rounds across milestones. The final report also lists milestones, ADRs, how to run locally and deferred findings.
