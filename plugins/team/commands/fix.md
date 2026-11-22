---
description: "Fix a bug by tier: T1 debugger → developer → code-reviewer (∥ security) → qa · T2 adds a qa pre-check and reports"
argument-hint: "<bug, error message, failing test or issue ID (I3)> [--tier T1|T2]"
disable-model-invocation: true
---

Fix this bug with the technical team:

$ARGUMENTS

You are the lead: follow `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` §3–§6 — Read it if you are not already the lead. Empty request → ask for the bug or symptom, then stop. An issue ID (`I3`) → its row in `.team/ISSUES.md` is the symptom; set its `status` to `in-progress` and `item` to this item's slug.

**Tier**: T1; T2 when it touches auth or permissions, payment processing (charging, refunds, payouts), schema migrations, or deleting or rewriting stored data. Calculation logic that tests cover (prices, totals, tax) stays T1. Below T2 no gate writes a report file: the debugger's brief says `Write: –` and its reproduction and root cause stay in its handoff; pass them to the next briefs verbatim.

1. **Root cause** — `technical-team:team-debugger` with the full symptom (error text, stack trace, failing command, environment). If the user only asked for the cause, stop here and report.
2. **Confirm** — several fix options, or risk to shared code, data or security → show the user and wait.
3. **QA pre-check (T2 only)** — `technical-team:team-qa` with the root cause and the qa-lines pre-check line: the regression test, failing on the unfixed code.
4. **Fix** — `technical-team:team-developer` with the root cause (`technical-team:team-dba` for data fixes): first the regression test, failing; then the fix; Evidence shows it failing before and passing after.
5. **Review** — `technical-team:team-code-reviewer`; ∥ `technical-team:team-security` if the bug is security-related. Blocking findings → step 4.
6. **Verify** — `technical-team:team-qa` with the qa-lines execution line: the regression test, the related suite, the area around the fix. Blocking findings → step 4 as one batch (run-kit `qa-loop.md`).

**Fix loop (steps 3–6)** — step 2 stays inline. **Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below. Workflow run: call Workflow with `name: 'technical-team:team-build-loop'` (`${CLAUDE_PLUGIN_ROOT}/workflows/build-loop.js`) and `args` = `{item, groups: [[{ticket: "fix", role: "developer", brief: <step 4 brief with the root cause>, files: <the files the root cause names>}]], reviewBriefs: {"code-reviewer": …, "security": …(only if security-related)}, qaPlanBrief: <step 3 brief (T2)>, qaBrief: <step 6 brief>}` (keys as `${CLAUDE_PLUGIN_ROOT}/commands/feature.md` lists them). Write `item` back first, then route per run-kit §6.

7. **Close** — lead §6; the report gives the root cause in one paragraph. Do not commit or push unless the user asks.
