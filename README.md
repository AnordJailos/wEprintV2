# AK IT'S TIME TO SHINE — Print Studio Platform

A complete, production-ready web platform for a print studio: customers browse the
catalogue, place orders, upload artwork, follow their job stage by stage, and ask a
studio assistant questions. The owner runs the whole business from a single admin
console.

---

# Part 1 — The Business Side

## What the platform does

| For customers | For the studio owner |
| --- | --- |
| Browse products with photos, prices and turnaround times | One console showing orders, revenue and the work queue |
| Choose options (size, finish) and see the price update | Move each job through its stages; the customer sees it live |
| Upload their artwork files | Review artwork, request fixes, message the customer |
| Track the order: Received → Printing → Delivered | Update payment status independently of production |
| See a gallery of past work for inspiration | Curate that gallery |
| Ask the studio assistant a question, any hour | Teach the assistant by writing plain-English notes |

## The order lifecycle

```text
Received → Artwork review → Proofing → Printing → Finishing → Delivered
                                                            ↘ Cancelled
```

Payment status (Unpaid / Deposit / Paid / Refunded) is tracked separately, so an
unpaid job can still be printed and a paid job can still be held.

Every stage change is timestamped and visible to the customer. Orders are never
deleted — cancelling keeps the history.

## The studio assistant

Customers ask questions in plain language. The assistant answers **only** from the
notes the owner has written (turnaround times, artwork requirements, payment terms).
If nothing has been written about a topic, it says so and points the customer at the
studio. It cannot invent a price or a promise.

Improving it means editing a note, not changing software.

## One administrator, by design

There is exactly one admin account — the owner. Signing up on the website always
creates a customer, the admin console rejects everyone else, and the database itself
refuses a second admin row. The account is created once during setup and can be
re-pointed at a new password if access is lost, without touching any business data.

## What it costs to run

Three small services and one PostgreSQL database. The assistant runs on a local
embedding model, so there is no per-question AI bill unless an external language
model is deliberately switched on.

## Business rules worth knowing

- The price stored on an order is the price at the moment of ordering. Raising a
  price today never rewrites an old order.
- Products are retired by marking them inactive, never deleted — deleting would break
  the link from historical orders.
- The inspiration gallery is marketing, not catalogue; nothing there is orderable.

---

# Part 2 — The Technical Side

## Stack

| Part | Technology | Port | Talks to |
| --- | --- | --- | --- |
| Frontend | React 19, TanStack Start, Tailwind, Vite | 8080 (dev) | Backend only |
| Backend API | Next.js 15 App Router, TypeScript, pg, Zod, jose | 8080 | Database, AI service |
| AI service | Next.js 15, transformers.js, pgvector RAG | 8000 | Database (read-only) |
| Database | PostgreSQL 15+ with pgvector | 5432 | — |

## Architecture

```text
        Browser
           │  HTTPS · JSON · JWT bearer
           ▼
   ┌───────────────┐
   │   Frontend    │  src/lib/api.ts — the ONLY file that knows the backend URL
   └───────┬───────┘
           │  /api/v1/*
           ▼
   ┌───────────────────────────────────────────┐
   │            Next.js Backend                │
   │   api/ ──▶ use_case/ ──▶ repository/      │
   │  (HTTP)     (rules)        (SQL)          │
   │               └──▶ ai/ (internal client)  │
   └────────┬──────────────────────┬───────────┘
            │ read + write         │ localhost only
            ▼                      ▼
   ┌────────────────┐      ┌────────────────┐
   │   PostgreSQL   │◀─────│   AI Service   │
   │   + pgvector   │ read │  Next.js + RAG │
   └────────────────┘ only └────────────────┘
```

### Key decisions

| # | Decision | Why |
| --- | --- | --- |
| D-1 | Clean architecture: `api → use_case → repository`, never backwards | Swapping the web layer or the store touches one ring |
| D-2 | The frontend talks to the backend and nothing else | Auth, validation and rate limiting live in exactly one place |
| D-3 | Auth guards run before handler bodies | A missing permission check is visible in review |
| D-4 | The AI service holds a `SELECT`-only database role | A bug or prompt injection there cannot damage studio data |
| D-5 | The AI service computes embeddings; the backend writes them | Keeps D-4 true |
| D-6 | The AI service binds localhost and is never public | Its only client is the backend, authenticated by a shared key |
| D-7 | One administrator, enforced in API, UI and a partial unique index | Defence in depth |
| D-8 | Path versioning under `/api/v1/` | `/v2` can live beside it |
| D-9 | One error shape, structurally enforced | Handlers cannot invent a different body |

## Repository layout

```text
├── src/                        Frontend (TanStack Start file-based routes)
│   ├── routes/                 /, products, orders, admin, assistant, inspiration
│   ├── components/             Design-system components
│   └── lib/api.ts              The single API boundary
└── printshop-platform/
    ├── backend/
    │   ├── migrations/         0001 schema · 0002 seed · 0003 read-only AI role
    │   ├── scripts/            migrate · seed-admin · run-tasks
    │   └── src/
    │       ├── app/api/v1/     34 public endpoints + /health + /docs
    │       ├── api/dto,docs/   Zod schemas · OpenAPI source
    │       ├── core/           config, errors, jwt, password, auth, rate-limit
    │       ├── db/             pool + transaction helper
    │       ├── entities/       Row types mirroring the schema
    │       ├── repository/     Every SQL statement
    │       ├── use_case/       Business rules
    │       └── tasks/          Cleanup + knowledge reindex
    ├── ai-service/
    │   └── src/                lib/{config,db,embedder,retrieval,generate,chunk,guard}
    │       └── app/            /health · /internal/ai/generate · /internal/ai/reindex
    └── docs/                   Ten deep-dive documents (see below)
```

## API surface

- Base URL `/api/v1/`, JWT bearer auth, JSON everywhere except artwork upload.
- Swagger UI at `/docs`, raw contract at `/api-docs/openapi.json`.
- Tags: auth, users, products, orders, designs, communications, inspiration, ai, admin.
- Two internal-only routes (`/internal/ai/generate`, `/internal/ai/reindex`) protected
  by a timing-safe `x-internal-key` comparison.

## The RAG pipeline

1. Knowledge entries are chunked at 150 words with 25-word overlap.
2. Each chunk is embedded with `Xenova/all-MiniLM-L6-v2` (384 dimensions).
3. The backend writes vectors into `knowledge_base_embeddings` (pgvector).
4. A question is embedded, matched by cosine distance (`<=>`), top 5 kept, anything
   beyond distance `0.7` discarded.
5. The answer is grounded in what survived — extractive by default, or through an
   optional OpenAI-compatible model. Nothing retrieved means an honest "I don't know".

Tuning dials: `TOP_K`, `MAX_DISTANCE`, `LLM_API_URL`.

## Security posture

- scrypt password hashing; JWTs signed with jose, 32-character minimum secret.
- CORS is an explicit allow-list; `*` is refused in production.
- Security headers: `nosniff`, `X-Frame-Options`, CSP.
- Rate limiting on authentication endpoints.
- Server-side pricing — the client never sets a price.
- Uploads are size-capped and served through a controlled route.
- Orders and their items are written in a single transaction.

## Running it

```bash
# Database
createdb printshop && psql -d printshop -c 'CREATE EXTENSION vector;'

# Backend
cd printshop-platform/backend && cp .env.example .env
npm install && npm run migrate && npm run seed:admin && npm run dev   # :8080

# AI service
cd ../ai-service && cp .env.example .env
npm install && npm run warmup && npm run dev                          # :8000

# Frontend (repo root)
npm install && npm run dev
```

Scheduled maintenance (expiring reset tokens, sweeping orphan uploads, catching up
knowledge vectors): `npm run tasks` from cron, every ten minutes.

Full setup detail: [printshop-platform/instructions.md](printshop-platform/instructions.md).

## Documentation map

| Document | For whom |
| --- | --- |
| [01-getting-started](printshop-platform/docs/01-getting-started.md) | Everyone |
| [02-owner-manual](printshop-platform/docs/02-owner-manual.md) | The studio owner — no code |
| [03-architecture](printshop-platform/docs/03-architecture.md) | Developers |
| [04-database](printshop-platform/docs/04-database.md) | Developers / DBA |
| [05-backend](printshop-platform/docs/05-backend.md) | Backend developers |
| [06-ai-service](printshop-platform/docs/06-ai-service.md) | Developers |
| [07-frontend](printshop-platform/docs/07-frontend.md) | Frontend developers |
| [08-customization](printshop-platform/docs/08-customization.md) | Everyone |
| [09-deployment](printshop-platform/docs/09-deployment.md) | Whoever hosts it |
| [10-maintenance](printshop-platform/docs/10-maintenance.md) | Whoever runs it |
