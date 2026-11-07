# API / backend service / worker / bot — live preview

The "user" is a client: a frontend, a mobile app, another service, a webhook sender, a chat platform. Preview the **running service with its real dependencies**, called the way that client calls it, and compare the responses with the contract.

## 1. Start it for real

| Piece | Do |
|---|---|
| Service | `commands.run`, `docker compose up -d <svc>` (background), `npm start`, `uvicorn app:app`, `go run ./cmd/api`, `./gradlew bootRun`, `dotnet run` |
| Database / cache / broker | the compose services or local instances the project uses, migrated and seeded (dba owns migrations/seeds; you only run what exists). Not an in-memory fake when the change touches queries |
| Third parties | the project's sandbox/test mode or its existing stub server (WireMock, MSW node, localstack); never live payment/email/SMS |
| Ready | poll the health endpoint or the port; read the startup log — a warning about missing config is a finding |

## 2. Drive it

**HTTP transcript** (`e2e/preview/w-012.hurl` with Hurl, or curl):

```hurl
# AC1 create
POST http://localhost:8080/api/projects
Authorization: Bearer {{test_token}}
Content-Type: application/json
{ "name": "Dự án thử nghiệm" }
HTTP 201
[Asserts]
jsonpath "$.id" exists
jsonpath "$.name" == "Dự án thử nghiệm"
header "Location" exists

# appears in the list without delay
GET http://localhost:8080/api/projects?page=1&size=20
Authorization: Bearer {{test_token}}
HTTP 200
[Asserts]
jsonpath "$.items[*].name" includes "Dự án thử nghiệm"

# validation
POST http://localhost:8080/api/projects
Authorization: Bearer {{test_token}}
Content-Type: application/json
{ "name": "" }
HTTP 422
[Asserts]
jsonpath "$.errors[0].field" == "name"

# no token
GET http://localhost:8080/api/projects
HTTP 401
```

Run: `hurl --test --variable test_token=<seeded test token> e2e/preview/w-012.hurl`. Without Hurl: `curl -sS -w '\n[status] %{http_code} [time] %{time_total}s\n' …` per case, saved as a transcript.

| Protocol | Driver |
|---|---|
| gRPC | `grpcurl -plaintext -d '{...}' localhost:50051 pkg.Service/Method` |
| GraphQL | POST the query; check `errors` is absent, not only status 200 |
| WebSocket / SSE | `websocat`, `curl -N` for SSE; check reconnect after the server restarts |
| Webhook receiver | replay a recorded/sample payload with the correct signature, then a wrong signature, then a duplicate delivery |
| Worker / queue | publish to the local broker (`redis-cli`/`rabbitmqadmin`/`kafka-console-producer`/localstack SQS), then check the side effect (row, file, outgoing call) and the log |
| Cron / scheduled job | run the job's entry point once with the documented command; run it twice (idempotent?) |
| Chat bot | the platform's test workspace / bot test mode, or replay the platform's event payload to the local endpoint; check the outgoing message body |

## 3. Checks

| Area | Check |
|---|---|
| Contract | response matches OpenAPI/schema/types the clients use (field names, types, nullability, enums, date format, pagination shape); consumers in the repo (frontend API client) still compile against it |
| Status codes | 2xx/4xx/5xx as documented; no 200 with an error body; no 500 for client mistakes |
| Errors | consistent error shape, human message, no stack traces or SQL in responses |
| Auth | no token, expired token, another user's resource (expect 403/404), role without permission — hand deep findings to security |
| Input | empty, too long, unicode, wrong types, extra fields, huge payload, concurrent identical requests (idempotency) |
| Data | pagination edges (first/last/empty page, page size limits), sort stability, filters with no match, large tables (with dba for query plans) |
| Resilience | dependency down or slow (stop the cache/broker container, delay a stub): timeout, retry, clear error, no hang, no data corruption |
| Worker | retry and dead-letter on failure, duplicate message processed once, poison message does not block the queue |
| Logs | no error-level lines on the happy path; errors on failure paths are useful and contain no secrets or personal data |
| Performance | response time of the changed endpoints on seeded realistic volume; N+1 queries in the log |

Service-specific bug rows: `common-bugs.md` section **V**.
