# W-000 — <title> · requirements

> Owner: **team-ba** (only the business analyst writes this file; everyone reads it). Path: `.team/requirements/W-000-<kebab-title>.md`.
> Status: draft → done. Approval (G1) is recorded by the lead in `.team/STATE.md`, not here.
> Labels: **C** confirmed by the user · **E** evidence (file:line, document, URL) · **A** assumption. The big picture (goals, capability map, glossary, business rules) lives in `.team/PRODUCT.md`.
> No secrets or real user data.

**Status:** draft

**Context:** <greenfield | operating system | discovery follow-up> · **Serves:** <G-1> · **Capability:** <row in PRODUCT.md>

**Problem / goal:** <one paragraph, in the user's terms>

**Success measure:** <what the user will observe when it works>

**Out of scope:** <bullets>

## As-is and impact
<!-- Operating system only; delete for greenfield. -->
- **Today:** <what happens now — file:line or document>
- **Changes:** <what will be different>
- **Impact:** flows <…> · roles <…> · data / existing records <…> · integrations <…> · operations/docs <…>
- **Must not change:** <behaviour qa keeps in its regression scope>

## Scenarios
<!-- The playback the user confirmed: concrete values, one line each. -->
1. <actor> does <action> → <result> (C)
2. If <exception> → <result> (A)

## User stories
- **W-000.S1** (Must) As a <role>, I want <capability>, so that <outcome>.

## Business rules
- BR-1, BR-3 (see `PRODUCT.md`) · new: **BR-4** <rule> — e.g. <example>

## Acceptance criteria
<!-- Each criterion must be checkable by a test or an observable result. -->
- **W-000.AC1** Given <context>, when <action>, then <observable result>.

## Quality targets
- **W-000.QT** platforms + form factors: <…> · accessibility: WCAG 2.2 AA · performance: <threshold or n/a> · locales: <…> (assumptions marked)

## Edge cases
- **W-000.E1** <case> → <expected behaviour>

## Assumptions
- **W-000.A1** <default taken without confirmation> — <who can confirm>

## Open questions
- **W-000.Q1** (blocking | default-able) <question> — options: <A / B> — recommended: <A, why> — <who can answer>
