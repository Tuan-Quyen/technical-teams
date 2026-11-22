# Elicitation — requirements from a user who does not have them yet

> Used by: ba · Read when: preparing a question round

## Sources, in this order

The brief in the user's words (C) → documents it names (E, section) → `.team/` notes: PRODUCT.md, requirements, designs, ADRs (E) → the code, for what the system really does, rules buried in conditions, roles, validations (E, file:line) → the web for domain norms, regulations and comparable products (E, URL; never project code, names or personal data in a query) → the user, through the main session, for intent, priorities and unwritten rules (C). Ask the user only what no other source gives.

## Dimensions (the gaps become questions)

Goal and its measure · actors, the affected and approvers · trigger and frequency (one by one or in bulk) · main flow step by step · alternatives and exceptions (missing, late, duplicated, refused, cancelled half-way) · business rules (calculations, limits, eligibility, state changes, overrides) · data (entered, required, derived, kept how long, exported) · permissions (see, create, change, delete, approve) · notifications and reports · integrations and what if they are down · existing users and data · constraints (deadline, budget, legal, platforms, languages, scale) · rollout and a way back.

## Question form

```
Q3 (blocking) — Refund after the return window
Why it matters: decides whether the refund screen needs an approval step and a new role.
  A. Refuse automatically after 30 days (simplest; no new role)
  B. Allow with manager approval (adds an approval flow and a permission)
  C. Always allow (no rule; risk of abuse)
Recommended: A — matches docs/policy.md §2 (E); B can be added later without rework.
```

Closed over open (at most one open question per round) · one decision per question, never two joined by "and" · consequences in the user's terms (cost, delay, an extra screen, risk), not technology · a default always present, so "OK" is a complete answer.

## Techniques

| Technique | Use it when |
|---|---|
| 5 whys | the request is a solution ("add an export button"): spec the need, keep the solution as one option |
| Example mapping | rules are vague: rule → one concrete example each → open questions |
| Story mapping | scope is large: activities left to right, stories under each, a line for the first slice |
| Context diagram | several systems or roles: the product in the middle, what flows on each arrow |
| State table | an entity has a life cycle: states × events → next state, who may trigger it |
| Decision table | conditions combine: every combination filled or marked impossible |
| MoSCoW | more wishes than capacity: you propose, the user decides |

## Playback (top of every round and of the final spec)

```
Understanding so far
- Goal: <one sentence> (C)
- Who: <actors>
- How it will work:
  1. <actor> does <action> → <result>          (C)
  2. If <exception> → <result>                 (A — default, see Q2)
- Rules: BR-3 <rule> — e.g. <example>          (E docs/policy.md §2)
- Not included: <out of scope>
```

Corrections the user makes are C from then on.

## When the user does not know

| Situation | Do |
|---|---|
| "I'm not sure" | your recommendation, its reason and what changing it later costs; mark it A |
| it depends on something they must check | list it as a user action; proceed on the default if default-able |
| it contradicts an earlier answer or a document | show both side by side; ask which holds |
| far more than the goal needs | story map + MoSCoW; propose the slice |
| three rounds and a blocking question still open | say so plainly; propose a spike, a smaller scope that avoids it, or a decision by the user |
