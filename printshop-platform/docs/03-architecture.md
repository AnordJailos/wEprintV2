# 03 — Architecture

## The shape of it

```text
        Browser
           │  HTTPS, JSON, JWT in the Authorization header
           ▼
   ┌───────────────┐
   │   Frontend    │  React + TanStack Start
   │  src/lib/api  │  ← the ONLY file that knows the backend URL
   └───────┬───────┘
           │  /api/v1/*
           ▼
   ┌───────────────────────────────────────────┐
   │             Next.js Backend                  │
   │                                           │
   │   api/  ──▶ use_case/ ──▶ repository/     │
   │   (HTTP)    (rules)       (SQL)           │
   │                │                          │
   │                └──▶ ai/  (HTTP client)    │
   └────────┬──────────────────────┬───────────┘
            │ read + write         │ localhost only
            ▼                      ▼
   ┌────────────────┐      ┌────────────────┐
   │   PostgreSQL   │◀─────│   AI Service   │
   │   + pgvector   │ read │  Next.js + RAG │
   └────────────────┘ only └────────────────┘
```

## Decisions and why

**D-1 — Clean architecture in the backend.** Dependencies point inward only:
`api` knows `use_case`, `use_case` knows `repository`, `repository` knows the
database. Nothing points back. The payoff is that swapping Actix for another
web framework, or Postgres for another store, touches one ring, not the app.

**D-2 — The frontend never talks to the AI service or the database.** It has
exactly one dependency: the backend's `/api/v1`. That means authentication,
rate limiting and validation are enforced in exactly one place.

**D-3 — Access level is a type, not an `if`.** Actix extractors decide who may
call a handler:

```rust
async fn list_products(state: Data<AppState>)                 // public
async fn get_me(state: Data<AppState>, user: AuthUser)        // any signed-in user
async fn dashboard(state: Data<AppState>, _a: AdminUser)      // admin only
```

The extractor runs before the handler body. Forgetting a permission check is
not possible; you would have to remove a function parameter, which is visible
in review.

**D-4 — The AI service holds a read-only database credential.** The
`printshop_ai` role has `SELECT` on two tables and nothing else. A bug (or a
prompt injection) in the Python process cannot damage studio data, because the
database will not let it.

**D-5 — The AI service computes embeddings; the backend writes them.** When
knowledge changes, the backend sends the text to `/internal/ai/reindex` and
gets back plain float arrays. The backend performs the `INSERT`. This is what
lets D-4 hold: the one process that needs write access is the one that has it.

**D-6 — The AI service is never exposed publicly.** It binds `127.0.0.1` and
has no authentication of its own, because its only client is a process on the
same machine. Do not put it behind a public hostname.

**D-7 — One administrator.** Enforced by the API (registration hardcodes
`customer`), the extractor (`AdminUser` → 403), the UI gate, and a partial
unique index in the database.

**D-8 — Path-based API versioning.** Everything is under `/api/v1/`. A future
`/api/v2/` can live beside it while old clients keep working.

**D-9 — One error shape, structurally.** Handlers return `ApiResult<T>`; the
only error type is `ApiError`, which owns its own HTTP rendering. A handler
cannot invent a different error body because it has nowhere to put it.

## Request path, end to end

A customer asks the assistant a question:

1. `assistant.tsx` calls `api.chat(question)`.
2. `src/lib/api.ts` POSTs `/api/v1/ai/chat` with the JWT attached.
3. `ai_routes.rs` maps it to `ai_handlers::chat`.
4. The `AuthUser` extractor verifies the token; a bad token never reaches the
   handler.
5. `ai_use_case` validates the question and calls `AiClient::generate`.
6. `AiClient` POSTs `http://localhost:8000/internal/ai/generate`.
7. The AI service embeds the question, queries pgvector for nearby chunks,
   drops anything past distance 0.7, and grounds an answer in what survived.
8. The answer and its source titles travel back up the same chain.

Nothing at step 7 can write to the database, and nothing at step 1 knows step 7
exists.

## Where to put new code

| You are adding | It goes in |
| --- | --- |
| A new URL | `api/routes/` + `api/handlers/` |
| A request or response shape | `api/dto/` |
| A business rule | `use_case/` |
| A SQL query | `repository/` |
| A new table | `entities/` + a new file in `migrations/` |
| Recurring work | `tasks/` |
| Anything AI | `ai-service/app/services/` |

If a rule feels like it belongs in a handler, it belongs in a use case. Handlers
should read as: extract, delegate, respond.
