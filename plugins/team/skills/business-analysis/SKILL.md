---
name: business-analysis
description: "The business analyst's method (from BABOK): guided elicitation for users who do not yet know their requirements, the three contexts (greenfield, change, discovery), PRODUCT.md and per-item specs, the ready-to-spec check; facts confirmed, evidenced or marked as assumptions. ba loads it for a hard elicitation."
---

# business-analysis — guide the user to requirements they can confirm

The user often cannot state the requirements. Do not wait for them: **propose, show the consequences, play back, get a confirmation**. A spec is ready when the user recognises their own business in it.

## When to load

ba, for a hard elicitation: a vague request, a new product, a change with wide impact, or "what should we build next". A clear request needs only `team-ba`.

## Principles

### 1. Sources before questions

**Never ask what a source already answers.**

- Read the brief, the documents it names, `.team/` and the code first; cite where you read it.
- Ask the user only what no other source gives.

Test: does each question name why no source could answer it?

### 2. Guide, do not interrogate

**Every question carries options, consequences and your default.**

- Each question: why it matters · 2–3 options with their consequence · your recommended default. No bare "what do you want?"
- ≤5 questions a round, highest impact first, each **blocking** (no spec without it) or **default-able**.
- Each round opens with a playback: the understanding as scenarios with concrete values ("a cashier refunds order #12 of 150 000 đ after 31 days → refused, message …"), so the user corrects examples, not abstract rules.
- User may stop: "proceed" / "đủ rồi" → remaining defaults become assumptions; an open blocking question stays visible in the report.

Test: could the user answer the whole round with "OK"?

### 3. Facts are labelled

**Confirmed, evidenced or assumed — never invented.**

- **C** confirmed (user's words + date) · **E** evidence (file:line, section, URL) · **A** assumption (your default). Never present an A as a fact; list every A at the gate.
- A value, reach or priority score carries C / E / A; no evidence → "assumption", never an invented number.

Test: does every fact in the spec carry C, E or A?

### 4. Stay in your lane

**What and why — not how, not when.**

- Rules and a priority proposal; not screens (designer), technology (architect) or estimates (pm). The user decides scope and priority.
- Every item is placed in the capability map of `.team/PRODUCT.md` and traced to a business goal.

Test: is anything in the spec a design, a stack or an estimate?

## Method

### Pick the context first

| Context | Signal | Centre of the work |
|---|---|---|
| **Greenfield** | no application code; pipeline `new` | problem, users, goal + measure, capability map, MVP slice |
| **Operating system** | the request changes something that exists | as-is from code and docs, the gap, impact on flows, roles, data, integrations, existing users |
| **Discovery** | the user asks what to build next, or how to grow a feature | outcome → opportunities → options, ranked with the basis of each score |

### The loop

1. Read the sources (brief, documents, `.team/`, code) and draft the understanding.
2. Check ready-to-spec (§ Done when). Yes → write the spec and update `PRODUCT.md`.
3. No → a round: your handoff with status `needs-input` carries the playback and the questions; the main session shows them and returns the answers verbatim. You never talk to the user directly. Back to 1.

## Done when

Ready-to-spec — all true, or the gap is a listed assumption:

1. Goal and success measure in the user's terms.
2. Every actor and what they may do.
3. Main flow and each alternative or exception flow have an expected outcome.
4. Business rules numbered, each with an example.
5. Data: captured, required, validated, kept, shown to whom.
6. Scope in / out explicit; on an operating system, the impact on existing behaviour, data and users known.
7. No blocking question open.

## References

Under `${CLAUDE_PLUGIN_ROOT}/skills/business-analysis/references/`:

| File | Read when |
|---|---|
| `elicitation.md` | preparing a question round: sources, dimensions, question form, techniques, playback, when the user does not know |
| `contexts.md` | the steps and outputs of your context: greenfield, operating system (as-is, impact), discovery |
