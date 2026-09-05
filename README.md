# AK IT'S TIME TO SHINE — Print Studio Platform

Everything you need to run, understand, customise and maintain the platform.

## What this is

A three-part full-stack web application for a print studio:

| Part | Technology | Port | Faces |
| --- | --- | --- | --- |
| Frontend | React + TanStack Start + Tailwind | 8080 | Customers and the studio owner |
| Backend | Next.js 15 (App Router), pg, Zod, jose | 8080 (API) | The frontend only |
| AI Service | Next.js 15, transformers.js, pgvector RAG | 8000 | The backend only — never the internet |
| Database | PostgreSQL 15+ with pgvector | 5432 | Backend (read/write), AI service (read only) |

## Documentation

Read these in order the first time. After that, jump straight to the one you need.

| Document | For whom | What it answers |
| --- | --- | --- |
| [docs/01-getting-started.md](docs/01-getting-started.md) | Everyone | How do I get it running on a fresh machine? |
| [docs/02-owner-manual.md](docs/02-owner-manual.md) | You, the studio owner | How do I use the site day to day? No code. |
| [docs/03-architecture.md](docs/03-architecture.md) | Developers | How do the three parts fit together and why? |
| [docs/04-database.md](docs/04-database.md) | Developers / DBA | Every table, every column, migrations, backups. |
| [docs/05-backend.md](docs/05-backend.md) | Backend developers | Layers, adding an endpoint, auth, background tasks. |
| [docs/06-ai-service.md](docs/06-ai-service.md) | Developers | The RAG pipeline, tuning it, teaching the assistant. |
| [docs/07-frontend.md](docs/07-frontend.md) | Frontend developers | Routes, the design system, the API boundary. |
| [docs/08-customization.md](docs/08-customization.md) | Everyone | "I want to change X" — recipes, easiest first. |
| [docs/09-deployment.md](docs/09-deployment.md) | Whoever hosts it | Production build, service files, TLS, hardening. |
| [docs/10-maintenance.md](docs/10-maintenance.md) | Whoever runs it | Routines, backups, troubleshooting, upgrades. |

## The one rule about admin access

There is exactly **one** administrator account. It cannot be created through
the website — signing up always produces a customer. It is created by running
the `seed` binary, and the database itself refuses a second one via the
`users_single_admin` unique index. See
[docs/02-owner-manual.md](docs/02-owner-manual.md#your-admin-account).

## Layout

```
printshop-platform/
├── backend/            Next.js API (clean architecture)
│   ├── migrations/     Plain .sql files, applied with psql
│   └── src/
│       ├── ai/         HTTP client for the Python service
│       ├── api/        dto / handlers / routes / docs  — the edge
│       ├── bin/        seed.rs (creates the admin)
│       ├── core/       config, errors, jwt, password, middleware
│       ├── entities/   SeaORM models, one per table
│       ├── repository/ every SQL statement lives here
│       ├── tasks/      background workers
│       └── use_case/   business rules
├── ai-service/         Next.js RAG service
│   └── app/            core / services / schemas / routers
└── docs/               the documentation listed above
```

Frontend source is the `src/` folder at the repository root.
