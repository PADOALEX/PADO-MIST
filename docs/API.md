# HTTP API (MVP)

All endpoints beginning with `/api` except `/api/auth/login` require an `Authorization: Bearer <token>` header. HTTP body is JSON unless an endpoint says multipart. Times are UTC ISO 8601; IDs are GUIDs.

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | server process health (not DB readiness) |
| `/api/auth/login` | POST | `{ "userName": "demo.student", "password": "<env password>" }`; returns JWT and role |
| `/api/auth/me` | GET | authenticated profile |
| `/api/documents` | GET | scope-filtered document requests |
| `/api/documents` | POST | `{ "kind": "study", "purpose": "..." }` |
| `/api/documents/{id}` | GET | scope-filtered single document |
| `/api/documents/{id}/{action}` | POST | `cancel/process/issue/reject`; `{ "expectedRevision": 1, "comment": "..." }` |
| `/api/cases` | GET | cases scoped to caller |
| `/api/cases` | POST | `{ "documentId": "guid", "consent": true, "motivation": "..." }` |
| `/api/cases/{id}` | GET | scoped case |
| `/api/cases/{id}/{action}` | POST | `accept/approve-plan/complete`; `{ "expectedRevision": 1, "confirmed": true, "comment": "..." }` |
| `/api/reports` | GET | report rows, immutable revisions, historical decisions, all scoped |
| `/api/reports` | POST | multipart fields `caseId`, `outcomeId`, `hours`, `from`, `to`, `summary`, `evidence`, optional `attachment` and on resubmit `reportId`,`version` |
| `/api/reports/{id}/review` | POST | `{ "version": 1, "decision": "approve", "confirmed": true, "comment": "..." }` |
| `/api/reports/{id}/versions` | GET | version details, historical decisions and attachment metadata |
| `/api/reports/{id}/files/{fileId}` | GET | authorized binary evidence download |
| `/api/audit/{kind}/{id}` | GET | audit events for authorized `document/case/report` |

Example:

```bash
TOKEN=$(curl -fsS http://127.0.0.1:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"userName\":\"demo.student\",\"password\":\"$MIST_DEMO_PASSWORD\"}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["accessToken"])')
curl -fsS http://127.0.0.1:8080/api/documents -H "Authorization: Bearer $TOKEN"
```

Common responses: 400 invalid form, 401 unauthenticated, 403 wrong role, 404 resource not visible, 409 conflicting status/stale revision, 413 oversized HTTP body where configured, 429 login rate limit.
