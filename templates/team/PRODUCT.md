# Product

> Owner: **team-ba** (only the business analyst writes this file; everyone reads it). The big picture every work item is placed in.
> Labels: **C** confirmed by the user (words + date) · **E** evidence (file:line, document section, URL) · **A** assumption, not yet confirmed.
> Keep it short: conclusions, not transcripts. No secrets or real user data. Removed rows move to `.team/archive/PRODUCT-<YYYY-MM>.md`.

## Vision
**Problem:** <whose problem, how they cope today>
**Product:** <what it is, in one or two sentences>

## Users and stakeholders
| Role | Goal | Uses / affected / decides |
|---|---|---|
| <role> | <what they want to get done> | uses |

## Goals and measures
| ID | Business goal | Measure the user can observe | Basis |
|---|---|---|---|
| G-1 | <goal> | <measure> | C <date> |

## Context
- **Other systems:** <system — what flows in/out>
- **Constraints:** <legal/compliance, deadline, budget, platforms, languages, scale>

## Capability map
<!-- Status: live · building (W-NNN) · planned · idea. One row per capability, grouped by user activity. -->
| Activity | Capability | Serves | Status | Work item |
|---|---|---|---|---|
| <activity> | <capability> | G-1 | planned | – |

## Glossary
| Term | Meaning in this business | Not to be confused with |
|---|---|---|
| <term> | <meaning> | <…> |

## Business rules
| ID | Rule | Example | Basis |
|---|---|---|---|
| BR-1 | <rule> | <concrete example with values> | E docs/policy.md §2 |

## Backlog
<!-- Ranked, best first. Scores are high / medium / low unless real data exists; each carries its basis. Size is a rough guess until the architect plans it. -->
| # | Opportunity | Option | Serves | Value | Reach | Confidence | Size | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | <need or pain, from the user's side> | <smallest option> | G-1 | high (E: 14 support tickets) | medium (A) | medium | S | idea |

## Decisions and assumptions
- <date> **C** — <decision, in the user's words> (W-NNN, Q2)
- **A** — <assumption still open> — <who can confirm>
