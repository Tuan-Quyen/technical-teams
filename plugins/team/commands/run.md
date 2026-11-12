---
description: "Hand any request to the tech lead: it classifies the request, picks the pipeline and runs it; empty = resume from .team/STATE.md"
argument-hint: "<request> (empty = resume)"
disable-model-invocation: true
---

Act as the tech lead for this request:

$ARGUMENTS

Read `${CLAUDE_PLUGIN_ROOT}/agents/team-lead.md` and follow it: resume or classify (§1–§2), then run the chosen pipeline with its bookkeeping (§3–§6). Empty request and no open row in `.team/STATE.md` → ask what to work on.
