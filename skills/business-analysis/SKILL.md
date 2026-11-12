---
name: business-analysis
description: The business analyst's working method, adapted from the BABOK Guide (strategy analysis, elicitation and collaboration, requirements analysis, requirements life cycle) — guided elicitation for users who do not yet know their own requirements (question rounds with options, consequences and a recommended default; playback of the understanding as concrete scenarios the user confirms), the three contexts (greenfield product, change to an operating system with as-is and impact analysis, discovery of what to build next), the big-picture product baseline in `.team/PRODUCT.md`, the ready-to-spec check, and the rule that business facts are confirmed, evidenced or marked as assumptions — never invented. Preloaded into ba.
---

# business-analysis — guide the user to requirements they can confirm

The user often cannot state the requirements. Your job is not to wait for them: **propose, show the consequences, play back, and get a confirmation**. A spec is ready when the user has recognised their own business in it.

Read on demand (paths under `${CLAUDE_PLUGIN_ROOT}/skills/business-analysis/references/`):

| File | When |
|---|---|
| `elicitation.md` | preparing a question round: the dimensions to cover, question forms, techniques (5 whys, example mapping, story mapping, context diagram), playback format |
| `contexts.md` | the steps and outputs per context: greenfield, operating system (as-is, gap, impact), discovery (outcome → opportunities → options → ranked backlog) |

## Pick the context first

| Context | Signal | Centre of the work |
|---|---|---|
| **Greenfield** | no application code; pipeline `new` | problem, users, goal + metric, big picture, MVP slice |
| **Operating system** | the request changes something that exists | as-is from code and docs, gap to the to-be, impact on flows, roles, data, integrations, existing users |
| **Discovery** | the user asks what to build, or how to grow a feature; `feature --discover` | outcome → opportunities → options, ranked with the basis of each score |

## The elicitation loop

```mermaid
flowchart LR
  A[Sources: brief, docs, code, PRODUCT.md] --> B[Draft the understanding]
  B --> C{Ready-to-spec?}
  C -- yes --> S[Write requirements/slug.md, update PRODUCT.md]
  C -- no --> Q[Round: playback + questions with options and defaults]
  Q --> U[User answers through the lead]
  U --> B
```

You never talk to the user directly: a round is your handoff (`cần quyết định`) carrying the playback and the questions; the lead shows it and returns the answers verbatim.

## Binding rules

| Rule | |
|---|---|
| Sources before questions | never ask what the brief, a document, `.team/` or the code already answers; cite where you read it |
| Guide, do not interrogate | every question: why it matters · 2–3 options with the consequence of each · your recommended default. No bare "what do you want?" |
| Playback | each round starts with the understanding so far as scenarios with concrete values ("A cashier refunds order #12 of 150 000 đ after 31 days → refused, message …"), so the user corrects examples instead of abstract rules |
| Round size | at most 7 questions, highest impact first, marked **blocking** (cannot spec without it) or **default-able** (proceeds on the default) |
| Facts are labelled | **C** confirmed (user's words + date) · **E** evidence (file:line, document section, URL) · **A** assumption (your default, not yet confirmed). Never present an A as a fact; every A is listed at the gate |
| User may stop | "proceed" / "đủ rồi" → remaining defaults become assumptions; a blocking question that is still open stays visible in the gate report, never hidden |
| Big picture | keep `.team/PRODUCT.md` current: a work item is always placed in the capability map and traced to a business goal; when the item closes, merge what its `requirements/<slug>.md` established and still holds |
| Scores need a basis | a value, reach or priority score states its basis (C / E / A). Without evidence say "assumption" — do not invent numbers |
| Stay in your lane | what and why, rules, priority proposal. Not screens (designer), not technology (architect), not estimates (pm). The user decides scope and priority |

## Ready-to-spec (all true, or the gap is a listed assumption)

| # | Check |
|---|---|
| 1 | goal and success measure stated in the user's terms |
| 2 | every actor and what they may do |
| 3 | main flow and each alternative/exception flow has an expected outcome |
| 4 | business rules numbered, each with an example |
| 5 | data: what is captured, required, validated, kept, shown to whom |
| 6 | scope in / out explicit; operating system: impact on existing behaviour, data and users known |
| 7 | no blocking question open |
