# Quality characteristics — what "quality" covers (ISO/IEC 25010:2023)

The 2023 product quality model has nine characteristics; "Usability" became **Interaction capability**. In the test plan, mark each characteristic **in scope** (with the risk that puts it there), **light** (smoke check only) or **out** (with the reason). Functional suitability and interaction capability are in scope for every work item with an observable change.

| Characteristic | Sub-characteristics (main ones) | How QA tests it here | Partner |
|---|---|---|---|
| **Functional suitability** | completeness, correctness, appropriateness | every AC and edge case with techniques (`techniques.md`); results correct (calculations, rounding, dates); the function actually serves the user's goal, not only the literal AC | ba for gaps |
| **Interaction capability** (UX) | appropriateness recognizability, learnability, operability, user error protection, user engagement, inclusivity (accessibility), user assistance, self-descriptiveness | `ux-verification.md`: design conformance, Nielsen's heuristics, accessibility, platform conventions, copy; first-time-user walkthrough | designer on escalation |
| **Compatibility** | co-existence, interoperability | every in-scope platform/browser/OS/device/form factor (`live-preview`); works with the other systems it talks to (contract tests, real integrations in sandbox) | devops |
| **Performance efficiency** | time behaviour, resource utilization, capacity | response/load time of changed flows on realistic data; no request waterfalls/N+1; large lists; memory/CPU on long sessions for apps | dba (queries), devops |
| **Reliability** | faultlessness, availability, fault tolerance, recoverability | dependency down/slow, offline, retry, crash/restart recovery, data not corrupted on interruption, idempotent operations | devops |
| **Security** | confidentiality, integrity, non-repudiation, accountability, authenticity, resistance | basics only: access by another user/role, input abuse, secrets/personal data in UI/logs — then hand to **security** (D4), never skip it | security |
| **Maintainability** | modularity, reusability, analysability, modifiability, testability | testability: report what could not be tested and why (no ids/labels, no test hooks, hidden state) | code-reviewer |
| **Flexibility** (was portability) | adaptability, scalability, installability, replaceability | install/upgrade/uninstall for apps and CLIs, packaging, migrations forward on existing data, configuration on a clean machine | devops, dba |
| **Safety** | operational constraint, risk identification, fail safe, hazard warning | only for products that can cause physical/financial harm: confirmations, safe defaults, warnings | ba |

## Risk → depth

| Risk factor (raises depth) | Typical areas |
|---|---|
| High impact | money, personal data, auth/permissions, data deletion, legal/compliance, the product's core flow |
| High likelihood | new code, complex logic, many conditions, concurrency, code changed often, areas with past defects, new technology/library |
| High exposure | screens/commands/endpoints most users hit, first-run experience |

High × high → several techniques + exploratory session + every platform. Low × low → smoke + regression. Write the ranking in the test plan so the lead and user can see what was tested less.
