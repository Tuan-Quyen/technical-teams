# Elicitation — getting requirements from a user who does not have them yet

> Reference of the `business-analysis` skill. Read it when preparing a question round.

## 1. Sources, in this order

| Source | What it gives | Label |
|---|---|---|
| The brief and "User-provided context" | the request in the user's words, constraints | C |
| Documents the brief names (PRD, notes, exports) | stated needs, contradictions, gaps | E (section) |
| `.team/PRODUCT.md`, `ARCHITECTURE.md`, `frontend-design/_system.md`, the open items' `requirements/` files | decisions already made, glossary, rules | E |
| The code (Read / Glob / Grep) | the as-is: what the system really does today, rules buried in conditions, roles, validations, data model | E (file:line) |
| The web (WebSearch / WebFetch) | domain norms, regulations, how comparable products solve it | E (URL) — never put project code, names or personal data in a query |
| The user, through the lead | intent, priorities, business rules nobody wrote down | C |

Ask the user only for what no other source gives.

## 2. Dimensions to cover (pick those that apply; the gaps become questions)

| Dimension | Ask yourself |
|---|---|
| Goal | what changes for the business when this works; how will they know (measure) |
| Actors | who uses it, who is affected without using it, who approves |
| Trigger and frequency | what starts the flow; how often; in bulk or one by one |
| Main flow | step by step, what the actor does and what they get back |
| Alternatives and exceptions | what if the data is missing, late, duplicated, refused, cancelled half-way |
| Business rules | calculations, limits, thresholds, eligibility, state changes, who may override |
| Data | what is entered, required, validated, derived, kept for how long, exported |
| Permissions | who may see, create, change, delete, approve |
| Notifications and reports | who must be told, when, through what; what must be reportable |
| Integrations | which other systems send or receive it; what if they are down |
| Existing users and data | what happens to records and habits that exist today |
| Constraints | deadline, budget, legal/compliance, platforms, languages, scale |
| Rollout | everyone at once or a group first; a way back |

## 3. Question form

```
Q3 (blocking) — Refund after the return window
Why it matters: decides whether the refund screen needs an approval step and a new role.
  A. Refuse automatically after 30 days (simplest; no new role)
  B. Allow with manager approval (adds an approval flow and a permission)
  C. Always allow (no rule; risk of abuse)
Recommended: A — matches the policy text in docs/policy.md §2 (E); B can be added later without rework.
```

| Rule | Detail |
|---|---|
| Closed over open | offer options; keep one open question per round at most, for what you cannot enumerate |
| One decision per question | never two decisions joined by "and" |
| Consequence in the user's terms | cost, delay, extra screen, risk — not technology |
| Default always present | so "OK" is a complete answer |

## 4. Techniques

| Technique | Use it when | How |
|---|---|---|
| 5 whys | the request is a solution ("add an export button") | ask why until the business need appears; spec the need, keep the solution as one option |
| Example mapping | rules are vague | per story: rules → one concrete example each → open questions; an example the user corrects is worth more than a rule they nod at |
| Story mapping | scope is large or the user wants "everything" | activities left to right, stories under each, a line for the first slice (MVP / this work item) |
| Context diagram | several systems or roles | the product in the middle, actors and systems around it, what flows on each arrow |
| State table | an entity has a life cycle (order, ticket, booking) | states × events → next state, who may trigger it |
| Decision table | several conditions combine | conditions → outcome, every combination filled or marked impossible |
| MoSCoW | more wishes than capacity | Must / Should / Could / Won't-now, proposed by you, decided by the user |

## 5. Playback format (top of every round and of the final spec)

```
Understanding so far — W-NNN
- Goal: <one sentence> (C)
- Who: <actors>
- How it will work:
  1. <actor> does <action> → <result>          (C)
  2. If <exception> → <result>                 (A — default, see Q2)
- Rules: BR-3 <rule> — e.g. <example>          (E docs/policy.md §2)
- Not included: <out of scope>
```

The user confirms or corrects the scenarios; corrections are C from then on.

## 6. When the user does not know

| Situation | Do |
|---|---|
| "I'm not sure" | give your recommendation with the reason and what it would cost to change later; mark it A |
| The answer depends on something they must check | list it under "user actions", proceed on the default if default-able |
| They contradict an earlier answer or a document | show both side by side, ask which holds |
| They ask for far more than the goal needs | story map + MoSCoW; propose the slice |
| Three rounds and a blocking question is still open | say so plainly in the handoff; propose a spike, a smaller scope that avoids the question, or a decision by the user |
