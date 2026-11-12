# Ops handoff

> Owner: **team-devops** (only devops writes this file; the technical writer turns it into runbooks).
> Raw but accurate operational facts. Mark anything not verified with `UNVERIFIED`.
> Never write secret values: name the secret and where it lives (e.g. "`DB_PASSWORD` in the CI secret store").
> Superseded entries move to `.team/archive/OPS_HANDOFF-<YYYY-MM>.md`.

## Environments
| Env | How it is reached | Deployed by | Notes |
|---|---|---|---|

## Build & run
- Build: `<command>` — verified on <date> / UNVERIFIED
- Run locally: `<command>`

## Deploy
1. <step with exact command>

## Rollback
1. <step>

## Config & secrets (names only)
| Name | Purpose | Where it is set |
|---|---|---|

## Health & monitoring
- Health check: <URL/command>
- Logs: <where>

## Changes log (short)
- <YYYY-MM-DD> W-000: <what changed operationally>
