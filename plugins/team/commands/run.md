---
description: "Hand any request to the orchestrator: it classifies the request, picks the pipeline and runs it; empty = resume from .team/STATE.md"
argument-hint: "<request> (empty = resume)"
disable-model-invocation: true
---

# /technical-team:run

Act as the orchestrator for this request:

$ARGUMENTS

## When to use

- Any request: the orchestrator classifies it. Typing `/technical-team:run` is your opt-in for the workflows of the pipeline the orchestrator picks.

## Steps

Read `${CLAUDE_PLUGIN_ROOT}/agents/team-orchestrator.md` and follow it: resume or classify (§1–§2), then run the chosen pipeline with its bookkeeping (§3–§6).

Empty request and no open item in `.team/STATE.md` → open rows in `.team/ISSUES.md`: follow `${CLAUDE_PLUGIN_ROOT}/commands/triage.md` (rank only with 5 or more `new` rows, else read it as it is) and offer the top ones; none → ask what to work on.

## Done when

- The chosen pipeline's own Done when holds.
