# run-kit §6 · Workflow steps

> Used by: the orchestrating session · Read when: a command runs a step through the Workflow tool, or routes its result

How a command runs a step through the Workflow tool. The command gives the opt-in, the workflow name and `args`; the rest is here.

## Run

- **Run** — write every agent's §3 brief yourself, set the item's `step` to `<n> (workflow)`, then call `Workflow` with `name: 'technical-team:team-…'` and the command's `args`. Only if the name is not found: Read `${CLAUDE_PLUGIN_ROOT}/workflows/<file>.js` (the file the command names) and pass its text as `script` with the same args.
- **Args check** — before every Workflow call whose `args` is more than a few lines (build-loop, plan-tickets, review, release, compact), write the args to a scratch file, run `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <file>`, fix what fails, and pass exactly that JSON. Malformed JSON (an extra or missing `}` or `]` is the usual cause) reaches the script as a plain string, and the run fails with "args arrived as a string that is not valid JSON". That error is always a mistake in your args: never patch, copy or debug the workflow script for it. Fix the JSON and call it again by `name`.
- **Task list** — one entry per workflow phase in place of the steps it covers (build-loop: `Plan` only with a `qaPlanBrief`, `Build`, `Review`, `Test`, `Docs`).
- **While it runs** — tell the user it runs in the background and the result arrives as a task notification. The workflow cannot ask the user; the orchestrator does.
- **Result** — first write `item` back to `.team/items/<slug>.json` verbatim (build-loop), then route by `status`.

## Route the result

| Status | Do |
|---|---|
| `done` | next step of the command |
| `blocked` | build-loop: round 3 used, blockers left (`blockers`) — qa-loop.md § Past the cap. Never report it as PASS |
| `stuck` | plan-tickets: show `tickets` and `issues` and decide with the user |
| `stopped` | route every `needsUser` entry below (`stoppedAt` names the stage); review and release have no `status`: route their `needsUser` the same way |

| `needsUser` status | Do |
|---|---|
| `blocked`, `needs-input` | the §5 table |
| `missing` | agent died or was skipped → re-spawn that agent once; still missing → ask the user |
| `no-verdict` | a gate returned no PASS/FAIL → treat as `blocked`, with its handoff |
| `disputed` | review.js: every blocking finding of a failing reviewer was refuted: show them; the user decides |
| `spec-issues` | qa pre-check found spec issues; nothing was built. Route each to its owner (ba, designer, architect) or the user. Resolved → re-run with `startAt: "plan"`; accepted as-is → `startAt: "build"` with the answer in `context` |
| `stalled` | a finding reopened twice: the same fix keeps failing. Show it with its test; ask the user (debugger, a design change, defer) |
| `retest-incomplete` | a gate skipped findings waiting for retest (`findings`): back to that gate (`startAt: "review"` or `"qa"`); nothing counts as fixed |
| `fail-without-blocker` | a gate said FAIL with no blocking finding that has a test: send it back to that gate for the test or a PASS; nothing was fixed |
| `unowned` | no ticket's `files` hold the finding's file: ask who owns it, set `owner` (a ticket) on the finding, re-run with `startAt: "review"`. Never widen a ticket's `files` without the answer |
| `qa-pending` | qa findings are open and the call had no `qaBrief`: re-run with it (`startAt: "qa"`) |
| `open-blockers`, `BLOCKED_PENDING_USER_DECISION` | review.js / release.js `items`: the item has open blockers; the verdict does not move it (release: NO-GO) |
| `invalid` | review.js / release.js: an entry of `items` is not an item JSON — pass the file as it is |

## Re-run (build-loop)

Call again with the full `groups`, the `item` as written, the same briefs and the user's answer verbatim in `context`:
- `Plan` → `startAt: "plan"` (or `"build"` when the user accepted the spec issues).
- `Build`, before any review → `startAt: "build"`, `fromGroup` = index (from 0) of the group with the stopped ticket.
- a fix stopped, or `Review` → `startAt: "review"`. `Test` or `Docs` → `startAt: "qa"`.

The round, the findings and their IDs carry on in the item; a re-run never resets them.
