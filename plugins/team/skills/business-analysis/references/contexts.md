# Contexts — greenfield, operating system, discovery

> Used by: ba · Read when: working out the steps and outputs of your context: greenfield, operating system, discovery

## 1. Greenfield (`new`, no application code yet)

`.team/PRODUCT.md`: **Vision** (whose problem, how they cope today, what is better afterwards) · **Users** (roles, goals, who decides, who is affected) · **Goals** (1–3, each with a measure the user can observe) · **Context** (other systems, existing data, legal, deadline, budget, platforms, scale) · **Capability map** (a story map of the product, MVP slice marked) · **Glossary** and **Business rules** with examples.

`.team/requirements/<slug>.md`: stories, ACs and edge cases for the MVP slice only; quality targets as ACs with concrete values. The MVP is the smallest slice that reaches one goal end to end, not the list of first ideas. Benchmark comparable products for the conventions users expect; cite the URLs.

## 2. Operating system (a change to something that exists)

In `.team/requirements/<slug>.md`:
- **As-is and impact** — what happens today in the flow being changed, which rule is enforced where (file:line), who can do it; then every place the change is felt.
- **Goal**, **Out of scope** — what must differ, and what must stay exactly as it is.
- Elicit only the gap: the new behaviour and each impact you cannot decide.

| Impact area | Look for |
|---|---|
| Flows | other flows that pass through the changed step |
| Roles | who gains or loses an action |
| Data | fields added, changed or removed; old records; migrations (→ dba) |
| Integrations | API consumers, webhooks, files, reports that read the changed data |
| Rules | rules elsewhere that assume the old behaviour |
| Operations | support, runbooks, monitoring, docs (→ writer, devops) |
| Regression risk | behaviour that must not change; qa builds the regression scope from this list |

No `PRODUCT.md` yet: create a short one from what you read (capabilities found in the code, marked `live`); do not document the whole system for a small change.

## 3. Discovery (what to build next, how to grow a feature)

1. **Outcome** — one measurable outcome for the business or the user, not a feature; elicit it if you were given a feature.
2. **Evidence** — what the user supplied (feedback, tickets, analytics, sales notes), the product itself (dead ends, missing states, friction; read the code and the design), comparable products.
3. **Opportunities** — needs and pains from the user's side ("when …, I want …, so that …"), each with its evidence. Compare opportunities before solutions.
4. **Options** — 1–3 per top opportunity, smallest first.
5. **Rank** — value toward the outcome · reach · confidence · rough size S/M/L (the architect confirms later), each with its basis C / E / A. No data → rank high / medium / low and name the evidence that would raise confidence. A fix to a broken or missing basic expectation outranks a new delighter of equal size.
6. **Backlog** — ranked rows in `PRODUCT.md` → Backlog, status `idea`, with your recommendation for the next one or two. The user picks; the pick becomes a normal `feature` item.

## 4. After delivery (milestone gates in `new`, when briefed)

Check the delivered behaviour against the goal, not only the ACs: which goal each capability serves, what the goal still misses, capabilities to mark `live` in `PRODUCT.md`, new backlog rows the work revealed.
