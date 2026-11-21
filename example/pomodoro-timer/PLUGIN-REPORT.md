# Plugin report — technical-team 0.22.0, Pomodoro Timer example

Run of `/technical-team:new` on the brief in `BRIEF.md`, branch `example-pomodoro-timer-v022`, 2026-11-19.

## What was built

- Pomodoro Timer 0.1.0: React 19, TypeScript strict, Vite 8, Tailwind 4, Zustand 5, Motion, Lucide, LocalStorage.
- Focus / Short / Long (25/5/15, editable 1–120 / 1–30 / 1–60), 4-session cycle, Start / Pause / Resume / Reset / Skip, SVG progress ring, auto-switch with Auto-start toggle.
- Timestamp-based timer, runtime outside React (one-shot end timeout, resync on visibility / focus), restore after refresh, "away" rule (> 90 s late → next phase waits), two-tab sync.
- Synthesised chime, browser notifications (one alert across tabs via Web Locks), "Allow notifications" button, Fullscreen Focus Mode with overlay fallback, document title, live-region announcements, reduced motion, self-hosted Inter v4.1.
- 350 tests (25 files); `npm install`, `npm run build`, `npm run lint`, `npm test` exit 0. CI: `.github/workflows/pomodoro-timer.yml` (path-filtered to this folder; never run on GitHub yet).
- Not verified in a real browser: POMO-M3 live checks (audible chime, real notification, two real tabs, native fullscreen, Focus view visuals, computed font, screen reader, reduced motion) — Chrome tools disconnected and the user chose to ship; POMO-AC18 hidden-tab accuracy (unit tests only; qa's browser tool cannot hide a tab). qa did check POMO-M1–POMO-M2 live at desktop width and a 360 px iframe (true 360 px viewport not possible).

## Rounds

| Gate        | Rounds                                     | Result                                                                               |
| ----------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Code review | 3 (one per milestone)                      | PASS ×3; 16 non-blocking findings, all fixed after each PASS and verified next round |
| Security    | 2 (POMO-M2, POMO-M3)                                 | PASS ×2; POMO-S1..POMO-S4 fixed, POMO-S5 deploy advice in README                              |
| QA          | 3 + 1 retest                               | PASS, PASS, FAIL (POMO-Q1: README not Prettier-clean) → PASS on retest                  |
| User gates  | ba questions ×2, stack, milestones, POMO-M1, POMO-M2 | all answered; 13 user decisions recorded in requirements / ADR                       |

## Did each agent stay in its role?

- Yes for ba, designer, architect, pm, qa, security, devops, writer: each wrote only its own files and flagged cross-owner issues instead of fixing them.
- developer: once wrote outside its ticket's file list (`src/index.css` in POMO-T3), and said so.
- designer: once changed a value outside its brief (Exit button dim 30 % → 60 % for contrast), and asked.
- code-reviewer: rounds 1–2 ran `npm` because the lead's brief asked; round 3 refused, citing its rule (see issue 4).
- lead (me): did one specialist action — downloaded the Inter font — after the developer refused the user's relayed approval (issue 3). The lead also ran build / lint / test itself to settle parallel-run noise.

## `.team/` files vs. Budget (final, blank lines counted with `wc -l`)

| File                                          | Lines | Budget                                                               |
| --------------------------------------------- | ----- | -------------------------------------------------------------------- |
| `STATE.md`                                    | 19    | ≤ 60 (peak ≈ 30)                                                     |
| `TASKS.md`                                    | 11    | open tickets only (peak 67)                                          |
| `PRODUCT.md`                                  | 76    | ≤ 150                                                                |
| `ARCHITECTURE.md`                             | 60    | ≤ 200                                                                |
| `adr/0001-frontend-stack.md`                  | 42    | ≤ 60                                                                 |
| `frontend-design/DESIGN.md`                   | 99    | ≤ 150                                                                |
| `archive/…/requirements/pomodoro-timer.md`    | 109   | ≤ 150                                                                |
| `archive/…/system-design/pomodoro-timer.md`   | 153   | ≤ 200                                                                |
| `archive/…/frontend-design/pomodoro-timer.md` | 150   | ≤ 150 — at the limit; designer merged rows three times to stay there |
| `archive/…/reports/…/review.md`               | 25    | ≤ 80                                                                 |
| `archive/…/reports/…/security.md`             | 40    | ≤ 80                                                                 |
| `archive/…/reports/…/qa.md`                   | 59    | ≤ 120                                                                |

All within budget. `STATE.md` ends with no rows.

## Issues in the plugin (with file references)

1. **Screen spec missing from `new`.** `commands/new.md:15-16` names only `frontend-design/DESIGN.md`; the per-item screen spec `frontend-design/<slug>.md` appears only in `agents/team-lead.md:91` (archive) and `commands/feature.md:17`. A UI product can't be built or QA'd without it — the lead had to add a step.
2. **Stack step assumes no stack.** `commands/new.md:15` says the architect "proposes 2–3 stacks". Here the user had named the stack; the lead re-scoped the step to the open choices only. Say "for what the user left open".
3. **No way to pass a user's approval to a subagent.** `skills/run-kit/SKILL.md:63,76` puts "which outside changes the user allowed" in the brief, and `agents/team-developer.md:31` allows outside changes "only when the user asked". The developer still refused a verbatim, relayed "Yes, download Inter" twice, because a lead message "is not the user's consent". Result: the lead did the download itself (out of role). Decide in run-kit whether a verbatim user answer under **Constraints** counts — and tell the agents.
4. **code-reviewer can't produce the evidence it is asked for.** `agents/team-code-reviewer.md:20` forbids shell beyond `git diff/log/show`, but run-kit §5 (`skills/run-kit/SKILL.md:135`) treats a `done` without evidence as `blocked`, and there is no base commit on a new project to diff. Rounds 1–2 broke the rule on the lead's brief; round 3 kept it and returned a "conditional PASS". Either allow read-only `npm run build/lint/test`, or say the lead supplies check results.
5. **Writer can't satisfy the project's lint.** `agents/team-writer.md:6` disallows Bash; this project's `npm run lint` runs `prettier --check .` over Markdown, so the README broke CI and qa raised POMO-Q1. An extra developer hop fixed it. Same for pm / ba / designer (`disallowedTools: Bash`), which also can't count their own lines (issue 6).
6. **Budget lines have no counting method.** Templates say "≤ N lines"; agents without a shell hand-counted or used PowerShell `Measure-Object -Line`, which skips blank lines (pm reported 52 for a 66-line file). Name the method (`wc -l` / `(Get-Content f).Count`) in the template header or run-kit §4.
7. **Parallel agents share one working tree beyond their Write files.** run-kit §3 (`skills/run-kit/SKILL.md:70`, "Parallel agents never share a file in **Write**") doesn't cover shared state: devops' `npm ci` deleted `node_modules` mid-way through qa's run; POMO-T5 / POMO-T6 each saw the other's half-written files fail lint. Add: no `npm ci` / installs / formatters over the whole tree while others run, and lead re-runs checks after a parallel group.
8. **Handoff opening often dropped.** `agents/team-developer.md:32,36` (same in other agents) require `<emoji> <name>:` and `### Handoff · <emoji> <name>`; developer, qa, code-reviewer and designer each omitted the emoji or heading at least once until the brief repeated it.
9. **`release` repeats the last milestone inside `new`.** `commands/new.md:18` runs `release.md` right after the final milestone's review / security / qa; `commands/release.md` step 1 re-runs all three. The lead reused the fresh reports (no code change between) to avoid a redundant round — `new` should say so.
10. **Push wording conflicts.** `commands/new.md:21` and `commands/release.md:20` say "Never … push" (new.md also "commit") outright; `agents/team-lead.md:101` says "unless the user asks". The user asked to push; the lead followed the lead rule. Use "unless the user asks" everywhere.
11. **Task-list tools came and went.** `agents/team-lead.md` § Task list: no task tool existed in the first session (searched, recorded in STATE); after a restart `TaskCreate` appeared mid-pipeline and the list was seeded late. Fine per the rule, but STATE.md being the truth is what made the resume work — worth stating in `new.md` step 0.
12. **Browser-tool limits not anticipated.** `agents/team-lead.md:102` covers missing tools, but nothing says what qa does when the browser can't hide a tab, emulate a 360 px viewport or reduced motion. qa handled it well ("not run", never PASS); a line in `skills/test-process` on these common gaps would set expectations at plan time (they were known by POMO-M1).

## What worked well

- Every gate stopped for the user; answers were passed verbatim and landed in requirements / ADR with dates.
- Findings kept fixed IDs across rounds; post-PASS fixes were re-verified in the next round.
- "Not run" was reported honestly everywhere; no check was claimed without evidence.
- `STATE.md` let the pipeline resume cleanly after a session restart and a model switch.
