# Architecture

## Origins and preservation

The PolyTECH Bootcamp prototype was an offline-first educational demonstration. Its source, unmodified logic, static screens and existing tests are retained in `legacy/Mist_Prototype`. We confirmed the original Node.js test suite passes **18/18** in the source-archive environment. Its demo accounts are **role toggles**, not real accounts; `localStorage` contains all state and Base64 attachments; its reCAPTCHA uses a public test key and is not verified server-side.

## New MVP architecture

```text
Web portal (static HTML/CSS/JS)  --Authorization: Bearer--> ASP.NET Core 10 Web API
                                                       |
                  +------------------------------------+----------------------------------+
                  |                                    |                                  |
             Domain/Workflow                       EF Core 10                      PrivateFiles
             status rules /                         MistDb                         outside webroot
             input validation                        |                                  |
                  |                               PostgreSQL                       mounted volume
                  |                                    |
                  +--------------------------- audit / decisions / revisions
```

New server-controlled entities: `AppUser`, `DocumentRequest`, `DualCase`, `Report`, immutable `ReportRevision`, `ReportDecision`, `StoredFile` and `AuditEvent`. Data relationships are enforced through SQL FK constraints and query scoping. Document and case statuses, report statuses, report versions and audit events are server-authoritative. The new portal stores its short-lived bearer token **in JavaScript memory only**, not in localStorage; login is required after reload. HTTPS is mandatory if the portal is deployed anywhere beyond loopback.

### High-level invariants

- All mutation endpoints authenticate the actor and verify role + resource assignment.
- Clients cannot choose student/mentor/curator identifiers. Server resolves them from its registered users and mappings.
- `DocumentRequest.Revision`, `DualCase.Revision` and `Report.Revision` are EF concurrency tokens. Every successful transition increments its revision; stale submissions receive conflict responses.
- DB transactions are implicit for a normal EF `SaveChangesAsync()` unit, covering state + audit event + new revision and decision records.
- `ReportRevision` and `ReportDecision` are append-only in application handlers. Approval state is computed from the current report's state and version, never from old reviews.
- Direct URLs for evidence files are **API endpoints**, not static file paths; resource scope is checked before a file is streamed.
- Generated final documents are **sample status records** for demo, not authentic signed PDFs or real official certificates.

### Deployment and migration

`docker-compose.yml` runs Postgres 17 and ASP.NET Core 10 on `127.0.0.1:8080`. Database state and private uploads persist in independent named volumes. API startup calls `Database.MigrateAsync()` using the initial migration in `Data/Migrations`. This is a **single-instance demonstration arrangement**; production needs externally coordinated migrations, managed secrets, HTTPS ingress, backups, encrypted file storage, rate limiting and anti-malware scanning before handling actual student records.

The first EF migration is authored explicitly with PostgreSQL SQL (not a scaffolded model snapshot). **For future schema changes, regenerate/validate the EF model snapshot with `dotnet ef migrations add` in an environment with SDK, then review the diff before upgrading data.**

### Future integrations — not claimed

Moodle/LTI 1.3, institution-issued SSO, enrolled-student verification, official transcript generation and signatures, Erasmus credit recognition and electronic dean-office document issuing all require external service ownership, credentials and a separately validated threat model. None are implemented by this local MVP.

The API UI is intentionally a scoped **MVP UI**, not a pixel-for-pixel migration of every legacy page. The complete original remains accessible separately, so there is no loss of the prototype's catalogue and mobile demo.
