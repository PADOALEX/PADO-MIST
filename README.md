# PADO MIST

[![Build and test](https://github.com/PADOALEX/PADO-MIST/actions/workflows/ci.yml/badge.svg)](https://github.com/PADOALEX/PADO-MIST/actions/workflows/ci.yml)

### University Workflow Management Platform · ASP.NET Core / EF Core / PostgreSQL

**PADO MIST** evolves my PolyTECH Bootcamp browser prototype, *Міст*, into a server-backed academic-workflow demo. It focuses on **state machines, resource authorization, immutable report versions, approval ordering and auditability** rather than simulated role switching.

> **Status: verified educational MVP (not production-ready).** GitHub Actions completed the .NET 10 Release build with **0 compiler warnings**, **6 xUnit tests**, **18 original JavaScript tests**, and an isolated **Docker/PostgreSQL API smoke suite** covering authorization, document transitions, case approval, versioned reports, evidence downloads and final completion. Browser-level visual QA, load testing and real-world security review remain out of scope.

## What it demonstrates

- ASP.NET Core Web API with validated JWT Bearer tokens and hashed demo-user passwords.
- Three roles: **Student**, **Mentor**, **Curator**, plus scoped access to assigned students, companies and documents.
- PostgreSQL persistence via EF Core, an initial SQL-backed EF migration, optimistic concurrency tokens and database constraints.
- Electronic document queue: `requested → processing → ready`, cancellation and rejection with reason.
- Dual education: `company_review → plan_review → active → completed`, including consent and an issued study certificate prerequisite.
- Three learning outcomes (`db`, `import`, `quality`) with separate reports. Only the mentor can approve a submitted report; only then may a curator approve its *current version*.
- Returned reports require a new version. Old version content and reviewer decisions remain queryable.
- Resource-scoped audit events and private evidence files, restricted by report access.
- Original responsive Ukrainian HTML/CSS/JavaScript prototype retained intact at `/prototype/` as an **explicitly insecure legacy demonstration**. The new `/` portal calls the authenticated API directly.
- xUnit domain tests, legacy Node.js tests, Docker Compose and GitHub Actions CI including an API authorization smoke test.

## Run with Docker

Prerequisites: Docker Desktop (with Compose v2). No PostgreSQL installation is required on your host.

```bash
cp .env.example .env
# Replace all REPLACE_WITH_* values in .env with random secrets.
docker compose up --build -d
```

Visit **http://127.0.0.1:8080/**. The API starts after PostgreSQL passes its health check. The backend automatically applies the initial migration and — in this **Development** Compose profile only — creates six isolated synthetic accounts:

| Account | Role | Assignment |
|---|---|---|
| `demo.student` | Student | `DEMO-31` |
| `demo.mentor` | Mentor | `DEMO-31`, `DEMO-COMPANY` |
| `demo.curator` | Curator | `DEMO-31` |
| `demo.student2` | Student | `DEMO-OTHER` |
| `demo.mentor2` | Mentor | `DEMO-OTHER`, `DEMO-OTHER-COMPANY` |
| `demo.curator2` | Curator | `DEMO-OTHER` |

All six accounts use the **local `MIST_DEMO_PASSWORD` value** from `.env`. There are no passwords in the public source. Seed accounts are educational; do not run this demo profile on a publicly accessible server.

For a clean database reset **(destroys local demo data)**:

```bash
docker compose down -v
```

### Local development without Docker

Install .NET SDK 10 and PostgreSQL 17+, then set `ConnectionStrings__Mist`, `MIST_JWT_KEY`, and optionally `MIST_SEED_DEMO=true` plus `MIST_DEMO_PASSWORD` in local environment variables. Run:

```bash
dotnet restore src/Mist.Api/Mist.Api.csproj
dotnet run --project src/Mist.Api
```

Database migrations run at API startup. The demo seeder runs only in `Development` when explicitly enabled.

## Verify

```bash
# Server domain tests
dotnet test tests/Mist.Api.Tests/Mist.Api.Tests.csproj -c Release

# Original prototype tests
npm --prefix legacy/Mist_Prototype run check
npm --prefix legacy/Mist_Prototype test

# Disposable Docker smoke tests (must start from a clean demo database)
export MIST_DEMO_PASSWORD='your-current-demo-password'
python3 tests/api_smoke.py
```

See [Architecture](docs/ARCHITECTURE.md), [Workflows](docs/WORKFLOWS.md), [API](docs/API.md) and [Security and limitations](docs/SECURITY.md).

## Scope and roadmap

**MVP:** document requests, queue status changes, consent-based dual case creation, mentor/curator approvals, immutable report revisions, audit log, scoped file access, original legacy prototype preserved.

**Next:** consistent UI integration for all original service catalogs (LeoKart/dormitory/Erasmus mock flows); dedicated dean's-office permissions; university verified identity; lifecycle policies for evidence files; hardened deployment secrets; advanced integration/load tests; verified zero-downtime migration procedure.

**Not implemented:** real Moodle/LTI/SSO, university enrolment verification, official grade updates, qualified e-signatures, real issuance of legally binding documents, real Erasmus+ enrollment, malware-scanning service. Test reCAPTCHA in the legacy prototype is not a security control.

## Repository structure

```text
src/Mist.Api/              .NET 10 Web API + static server-backed portal
  Domain/                  state rules and entities
  Endpoints/               document, case and report APIs
  Security/                JWT and synthetic demo user setup
  Storage/                 private file validation/storage
  Data/Migrations/         PostgreSQL baseline migration
tests/Mist.Api.Tests/       xUnit domain tests
tests/api_smoke.py         Docker API authorization smoke test
legacy/Mist_Prototype/     unmodified original Bootcamp prototype
.github/workflows/ci.yml  build + JavaScript tests + Compose smoke
```

MIT-licensed portfolio demonstration. Not affiliated with or operated by any university. Never publish student personal information, production keys or uploaded private evidence.