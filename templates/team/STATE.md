# Team state

> Owner: **team-lead** (only the tech lead writes this file; everyone reads it).
> Open work items only. Summaries and conclusions; no logs, secrets, tokens or real user data.
> A closed item's block moves to `.team/archive/<slug>/STATE.md` (Lead manual §6, closing an item).

## Open items

<!-- The lead assigns the ID (W-001, W-002, ...) and the slug W-NNN-<kebab-title>; every folder in .team/ names the item's file by that slug. -->

| ID | Slug | Pipeline / tier | Status | Gate | Waiting on |
|---|---|---|---|---|---|
| W-000 | W-000-<kebab-title> | <feature (full) / T2> | running | G1 pending | – |

**Next ADR number:** 0001

### W-000 — <title>
- **Slug:** W-000-<kebab-title>
- **Pipeline / tier:** <feature (full | plan-only | small) | fix (fix | hotfix | diagnose) | review | ... > / <T1 | T2 | TB> — <why this tier>
- **Status:** running | waiting-for-user | blocked | done
- **Gate:** G1 pending | G1 approved | G2 passed | G3 passed | G4 done
- **Approvals:** <gate> approved by user on <YYYY-MM-DD>: "<user's words>"
- **Expected behaviour (T1 only):** <2–5 bullets>
- **Loop log:** round <n>: <failing items: count + IDs> → <what changed> · escalation: none | debugger | architect/ba | waiting for user
- **Results:**
  - QA: <verdict line of qa/<slug>.md + command + counts>
  - Review: <verdict line of reports/<slug>/review.md · blocking n / should-fix n / suggestions n>
  - Security: <verdict line of reports/<slug>/security.md>
  - Debug: <root cause in one line>
  - Specialists: <name: verdict>
- **Deferred findings:** <finding ID — reason — owner>
- **Waiting on user:** <decision needed>
- **Final report:** <the §8 report, written at G4 just before the block is archived>

<!-- Extra lines for a work item with pipeline `new` (whole new project). The lead updates them after every step so the run resumes at the right place. -->
<!--
- **Input:** idea: "<verbatim, short>" | document: <path>
- **Phase:** N0 setup | N1 requirements | N2 stack | N3 plan | N4 milestone Mk/<n> | N5 ops | N6 docs | N7 release
- **Gate:** REQ pending | STACK pending | G1 pending | Mk pending | RELEASE pending | done
- **Next step:** <file + step ID, e.g. feature.md D3 on M2 tickets (round 2)>
- **Milestones:** M1 <name> done (<YYYY-MM-DD>) · M2 <name> running · M3 <name> todo
-->

## Single tasks (T0)

<!-- One line per T0 task; no other file is created for it. Keep the latest 20 lines. -->
<!-- - <YYYY-MM-DD> <role>: <what was done> (<files changed, or "no file">) -->

## Hires

<!-- The lead adds a line only after the user approved the hire in their own words; hr creates the agent file only when this line exists. -->
<!-- - HIRE-APPROVED: <specialist-name> (<YYYY-MM-DD>, scope: project|user, user said: "<words>") -->

## Specialist usage

<!-- - <specialist-name>: last used <YYYY-MM-DD> on W-000 (<hook point>) -->
