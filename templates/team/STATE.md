# Team state

> Owner: **lead** (only the tech lead writes this file; everyone reads it).
> Summaries and conclusions only. No logs, secrets, tokens or real user data.
> Finished work items move to `.team/archive/STATE-<YYYY-MM>.md`.

## Active work

<!-- One block per work item. The lead assigns the ID (W-001, W-002, ...); SPEC, PLAN and TASKS use the same ID. -->

### W-000 — <title>
- **Pipeline / tier:** <feature | change | fix | hotfix | ... > / <T0 | T1 | T2 | TB> — <why this tier>
- **Status:** running | waiting-for-user | blocked | done
- **Gate:** G1 pending | G1 approved | G2 passed | G3 passed | G4 done
- **Approvals:** <gate> approved by user on <YYYY-MM-DD>: "<user's words>"
- **Loop log:** round <n>: <failing items: count + IDs> → <what changed> · escalation: none | debugger | architect/analyst | waiting for user
- **Results:**
  - QA: <PASS/FAIL + command + counts>
  - Review: <blocking n / should-fix n / suggestions n>
  - Security: <blocking n / ...>
  - Debug: <root cause in one line>
  - Specialists: <name: verdict>
- **Deferred findings:** <finding — reason — owner>
- **Waiting on user:** <decision needed>

## Hires

<!-- The lead adds a line only after the user approves a hire. The guard lets hr create the agent file only when this line exists. -->
<!-- - HIRE-APPROVED: <specialist-name> (<YYYY-MM-DD>, scope: project|user) -->

## Specialist usage

<!-- - <specialist-name>: last used <YYYY-MM-DD> on W-000 (<hook point>) -->

## Final reports

<!-- Latest report per work item, newest first. Older reports go to the archive. -->
