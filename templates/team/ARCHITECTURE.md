# Architecture

> Owner: **team-architect** (only the architect writes this file; everyone reads it).
> The system as it is now, as an overview: at most ~200 lines. Detail that does not fit belongs in an ADR (`.team/adr/`) or in the code; link to it instead of copying it.
> Decisions and their reasons live only in `.team/adr/`; this file points to them by number.

## Purpose and context
<What the system does, for whom, and what it talks to. A context diagram in text or Mermaid.>

## Building blocks
| Component | Responsibility | Tech | Code location |
|---|---|---|---|

## Key flows
<The 2–5 flows that matter most: request path, async jobs, auth.>

## Data
<Main stores, who owns which data, schema location, migrations approach.>

## Cross-cutting concerns
- Auth & authorization:
- Error handling & logging:
- Configuration & secrets (names and locations only):
- Performance & scaling:

## Operations
<How it is built, run, deployed and rolled back: the commands and the files that define them (CI, Dockerfile, manifests). Names of config and secrets only.>

## Constraints and conventions
<Things every change must respect.>

## Decision index
| ADR | Title | Status |
|---|---|---|
