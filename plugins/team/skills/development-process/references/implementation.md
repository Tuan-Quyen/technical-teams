# Implementation — shaping the change

## Read the code first

- Open the files the ticket names and their callers; find how the neighbouring code does the same thing (naming, layering, errors, logging, config, tests). Copy that. A new pattern needs a reason you can state in one line.
- Check the system design's **Contracts** and **Implementation plan** step for this ticket; the plan's files are your files.
- Library or framework behaviour you are not sure of → read its docs or source; do not rely on memory.

## Contracts

| Change | Do in the same ticket |
|---|---|
| API request/response, status codes, error shape | your side as the design's **Contracts** pin it; both sides only when both are in your `Files`, else `needs-input`. Keep old fields until every caller moved (or the design says it is a breaking change) |
| event or message schema | your side as pinned; producer and consumers together only when both are in your `Files`, else `needs-input`; a test that round-trips one message |
| DB schema | the migration is dba's ticket; you change the code that reads/writes it, behind the order the design gives (expand → backfill → contract) |
| config or env var | the default, the example config, the docs line the writer needs (name it in the Handoff) |

## States checklist

For every changed path, decide what happens — then test the ones that can happen:

- empty / none / zero · one · many · the maximum
- invalid input · missing field · wrong type · too long
- error from a dependency · timeout · slow response · retry
- concurrent use · double submit · stale data
- no permission · expired session · another user's data
- partial failure: half the work done, then an error

## Error handling

- Handle an error where you can do something about it; otherwise let it propagate with context. Never catch and ignore.
- User-facing errors say what happened and what to do; logs say why (no secrets, no personal data).
- Validate at the boundary (request, file, message), trust inside.

## Refactoring

- Refactor only what the ticket needs, in a separate step from the behaviour change, with the tests green before and after.
- A refactor that grows past the ticket's files → stop and say so (`needs-input`); it becomes its own ticket.

## Dependencies

- A new dependency needs the design's approval (architect); otherwise use what the project has.
- Parallel agents running → no installs and no tree-wide formatter or codegen (the brief names them under `parallel with:`).

## Performance and safety, in proportion

- Avoid the obvious traps: N+1 queries, unbounded loops or lists, loading whole tables, blocking calls on hot paths.
- Inputs that reach queries, shell, HTML or file paths are escaped or parameterised; security reviews it, you prevent it.
