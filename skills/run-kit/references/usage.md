# technical-team — using the plugin

> Reference of the `run-kit` skill: read it when the user asks how to use the technical team or what a command does. Agents do not need it for their work.

## 1. Start and run modes

| Step | Do |
|---|---|
| 1 | Optional: `/technical-team:init` — creates `.team/STATE.md` + `.claude/technical-team.json` (never overwrites). Other `.team/` files are created on demand |
| 2 | Pick a mode (below) and run a command |

| Mode | Start | Gates |
|---|---|---|
| Commands (default) | type `/technical-team:<command>` | lead runs as a subagent, stops with `Chờ duyệt …`; you answer in the main session; the lead resumes |
| Lead as main session | `claude --agent technical-team:team-lead` or `"agent": "technical-team:team-lead"` in `.claude/settings.json` | lead asks you directly |

```mermaid
flowchart LR
  U[You] -->|/technical-team:cmd + context| M[Main session]
  M -->|brief + User-provided context| L[lead]
  L -->|briefs| T[team agents]
  T -->|Phiếu bàn giao| L
  L -->|Báo cáo / Chờ duyệt| M --> U
```

## 2. Commands

| Command | Arguments | Pipeline | Gates |
|---|---|---|---|
| `run` | `<request>` | lead picks T0/T1/T2/TB (or `new`) and the mode | by tier |
| `new` | `<idea \| path/to/PRD>` (empty = resume) | requirements → stack + architecture → MVP plan → milestones (delivery loop) → ops → docs → release; resumes from `.team/STATE.md` | stops only at REQ, STACK, G1, each milestone, RELEASE (+ hiring gate / escalation) |
| `init` | `[--all]` | create `.team/STATE.md` + `.claude/technical-team.json`; `--all` = every singleton file up front | – |
| `status` | – | summary of `.team/`, no agents | – |
| `feature` | `<description>` | ba elicitation (REQ rounds when it must ask) → plan → G1 → delivery loop (with security) → docs | G1–G4 |
| | `<goal> --plan` | ba → architect → pm → stop, no code | G1 |
| | `<description> --small` | T1: delivery loop (security if triggered) | G2–G4 |
| | `<need> --discover` | not sure what to build: ba finds opportunities and ranks options into the backlog in `.team/PRODUCT.md`; you pick; no code | DISCOVER |
| `fix` | `<bug>` | debugger → delivery loop with regression test | G1 if risky, G2–G4 |
| | `<bug> --hotfix` | urgent: minimal fix, security always, short docs | G2–G4 |
| | `<symptom> --diagnose` | debugger only, no code | – |
| `review` | `[diff scope]` | code-reviewer ∥ security on a diff | G3 |
| | `--audit [scope]` | security, full read-only audit | – |
| `test` | `[scope]` | qa fills missing tests | G2 |
| `infra` | `<request>` | devops proposal → G1 → devops → code-reviewer → security → runbook | G1, G3, G4 |
| `release` | `[version]` | devops ∥ security ∥ qa → CHANGELOG → GO/NO-GO | G2–G4 |
| `docs` | `[scope]` | writer syncs docs | G4 |
| | `--adr <decision>` | architect writes an ADR + updates `.team/ARCHITECTURE.md` | – |
| `hire` | `<domain or need> [why]` | hr hires a specialist: into the plugin (in the technical-team repo) or into this project | hiring gate |
| | `--roster` | roster + hr review | retirement approval |

Flags can also be said in words ("chỉ lên kế hoạch", "gấp", "chỉ chẩn đoán", "audit", "ghi ADR"); the lead records the mode in `STATE.md`.

## 3. Gates and delivery loop

When the request does not say exactly how things should work, the ba does not guess: it reads the documents and the code, then sends a **round** through the lead (gate `REQ`) — its understanding as concrete scenarios, plus at most 7 questions, each with why it matters, options with consequences and a recommended default. Answer per question, "OK" (all defaults) or "proceed" (stop asking; the rest become assumptions listed again at G1). The big picture it builds is kept in `.team/PRODUCT.md`.

| Gate | Passes when |
|---|---|
| G1 | you approved spec + plan (or a risky fix direction) |
| G2 | qa PASS on the final code: its exit criteria met (tests with real output, live preview for observable changes, UI/UX verified, no open blocker/critical/major defect); design items qa escalates decided by the designer |
| G3 | no blocking finding (code-reviewer, security, specialists) on that same code |
| G4 | docs updated, report delivered, item closed: open findings become follow-up tickets, owners merge what stays true, the item's files move to `.team/archive/<slug>/` |

```mermaid
flowchart LR
  D[developer] --> CR[code-reviewer ∥ security first pass]
  CR -- blocking --> D
  CR -- clean --> Q[qa: tests + live preview + UI/UX + exploratory]
  Q -- FAIL --> D
  Q -- PASS --> S{security required?}
  Q -- design items escalated --> DR[designer decides]
  DR -- fix --> D
  DR -- accept --> S
  S -- yes --> SEC[security: delta only]
  SEC -- blocking --> D
  SEC -- clean --> X[G2 + G3 passed]
  S -- no --> X
```
Squads: Discovery (ba → designer → architect → pm → qa plan) runs as a chain; Build (developer ×N, devops, dba) in parallel on disjoint files; Verify (code-reviewer ∥ security on one diff, then one qa run per work item covering every platform); Support (debugger, writer, hr) on demand. The lead stays the only dispatcher.

Small mode: a micro change (≤ 3 files, ≤ 40 lines, no security/contract/shared/test/infra/data/dependency change, no new screen) gets one qa micro verify instead of code-reviewer + qa. No round limit. Progress = fewer open in-scope blocker/critical/major defects; same failure unchanged for two rounds, or three rounds without progress → debugger → architect/ba → you. Only in-scope defects block; pre-existing ones become new work items. Suspected design flaw (developer evidence, plan-level root cause, defect cluster) → straight to the architect, who researches and revises the plan; a user-visible revision comes back to you at G1.

## 4. Specialists, skills, context

| Thing | Where | Effect |
|---|---|---|
| Plugin specialists | plugin `config/agents.json` (hired in the technical-team repo) | available in every project; their limits are instructions, like every role's |
| Project specialists | `.team/ROSTER.md` + `HIRE-APPROVED: <name>` in `.team/STATE.md` | hired with `hire`; the lead calls one only with that approval line |
| Plugin skills | `business-analysis` (the ba's method: guided elicitation rounds, greenfield / operating system / discovery contexts, ready-to-spec check) | preloaded into ba |
| | `test-process` (qa's full test process: plan, static review, techniques, quality characteristics, UI/UX verification, defects, test summary) — preloaded into qa |
| | `live-preview` (run the real product — web, mobile, desktop, CLI, API/service — drive it through its interface, per-platform drivers, known-bug catalogue) | preloaded into qa; developer and designer may load it; no config needed |
| Skills per role | `.claude/technical-team.json` → `"skills": { "team-designer": ["<design skill>"], "team-developer": ["react-native"] }` | lead names the fitting ones in each brief; agents are told to load no others |
| Your own context | skills you install and run yourself in the main session | passed to the lead as "User-provided context" |
| External agents | `.claude/technical-team.json` → `externalAgents` (default `["Explore"]`) | the lead may call them for current-state context and briefs them read-only |

## 5. The `.team/` workspace

| Path | Writer | Holds |
|---|---|---|
| `STATE.md` | lead | open items only: index, gate, approvals, loop log |
| `TASKS.md` | pm (lead: `Status` column) | tickets of open items + follow-ups |
| `PRODUCT.md` | ba | the current truth of the product |
| `ARCHITECTURE.md` | architect | overview (~200 lines max), points to ADRs |
| `ROSTER.md` | hr | project specialists |
| `requirements/<slug>.md` | ba | requirements of one work item |
| `system-design/<slug>.md` | architect | design + implementation plan |
| `frontend-design/_system.md`, `frontend-design/<slug>.md` | designer | design system; one item's flows, screens, states |
| `adr/NNNN-<decision>.md` | architect (number from the lead) | the only place a decision is written |
| `qa/<slug>.md` | qa | test plan → RTM → findings → round detail → verdict |
| `reports/<slug>/review.md`, `security.md`, `debug.md` | code-reviewer, security, debugger | verdict line + cumulative findings + latest round |
| `docs/**` | writer | runbooks, API docs, guides |
| `archive/<slug>/` | lead (moves) | every file of a closed item |

`<slug>` = `W-NNN-<kebab-title>`. Reports and the qa file start with `Verdict: PASS | FAIL · Round N`; finding IDs (`R-01`, `S-01`, `Q-01`) are fixed, status `open` → `fixed` → `verified`. Nothing enforces who writes what: each agent's tool list and instructions are the only limit, and the lead checks every handoff against `git status`.

A project still on the old single-file layout: `node "${CLAUDE_PLUGIN_ROOT}/scripts/team-migrate.mjs"` prints the plan, `--apply` writes it.

Full documentation: `${CLAUDE_PLUGIN_ROOT}/README.md`.

