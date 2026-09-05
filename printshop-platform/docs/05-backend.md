# 05 — Backend Guide (Next.js)

Next.js 15 App Router + `pg` + Zod + `jose`, arranged as clean architecture.
TypeScript everywhere, no ORM magic: every SQL statement is visible in one layer.

---

## The layers

```text
src/app/api/v1/…   URL → handler (App Router route files).  Knows: dto, use_case
src/api/dto/       Request/response shapes + Zod validation. Knows: entities
src/api/docs/      The OpenAPI 3.1 document served at /docs
src/use_case/      Business rules. The interesting part.     Knows: repository, ai
src/repository/    Every SQL statement in the codebase.      Knows: entities, db
src/entities/      Row types, one per table.                 Knows: nothing
src/core/          config, errors, http, jwt, password, auth, rate-limit
src/db/            The connection pool and `tx()` helper
src/ai/            HTTP client for the AI service
src/tasks/         Background maintenance, run by `npm run tasks`
```

Dependencies point one way, downward. A repository never calls a use case; an
entity imports nothing. When you are unsure where something goes, ask what it
would need to import.

---

## Adding an endpoint

Say you want `GET /api/v1/products/{id}/related`.

**1. Repository — the SQL.**

```ts
// src/repository/product.repository.ts
async findRelated(id: number, limit = 4): Promise<ProductRow[]> {
  const { rows } = await query<ProductRow>(
    `SELECT * FROM products
      WHERE is_active = TRUE
        AND category = (SELECT category FROM products WHERE id = $1)
        AND id <> $1
      ORDER BY id LIMIT $2`,
    [id, limit],
  );
  return rows;
}
```

Parameters are always `$1, $2, …`. Never build SQL by string concatenation —
that is the one rule with no exceptions.

**2. Use case — the rule.** ("Related means same category, active, at most four.")

```ts
// src/use_case/product.use-case.ts
async related(id: number) {
  const product = await ProductRepository.find(id);
  if (!product) throw ApiError.notFound('No such product.');
  return (await ProductRepository.findRelated(id, 4)).map(productResponse);
}
```

**3. Route file — plumbing only.**

```ts
// src/app/api/v1/products/[id]/related/route.ts
import { withErrors } from '@/core/errors';
import { list, readId } from '@/core/http';
import { ProductUseCase } from '@/use_case/product.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrors(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  return list(await ProductUseCase.related(readId(id, 'product id')));
});
```

**4. Document it** in `src/api/docs/openapi.ts`, or it will not appear at
`/docs`.

Handlers stay three lines because everything interesting lives one layer down.
That is the point.

Two things every route file needs: `runtime = 'nodejs'` (the `pg` driver is not
edge-compatible) and `dynamic = 'force-dynamic'` (an API response must never be
statically cached).

---

## Access control

Three shapes, three access levels:

```ts
export const GET = withErrors(async () => list(await ProductUseCase.list()));            // public
export const GET = withErrors(async (req) => ok(await UserUseCase.me(await requireUser(req))));  // signed in
export const GET = withErrors(async (req) => { await requireAdmin(req); … });            // admin only
```

`requireUser` and `requireAdmin` live in `src/core/auth.ts`. They read the
`Authorization: Bearer` header, verify the JWT signature and expiry with `jose`,
and — for `requireAdmin` — check `role === 'admin'`, throwing 403 otherwise.
Because they throw, execution stops before the rest of the handler runs.

**There is exactly one admin.** A partial unique index in the schema
(`0001_init.sql`, decision D-7) makes a second admin row impossible, so
"admin" is a fact about the database, not a flag someone can flip in a browser.

**Ownership** is separate from authentication. A signed-in customer must not read
another customer's order, so use cases check it explicitly:

```ts
assertOwnership(user, order.user_id);   // throws 403 unless it is theirs, or they are the admin
```

Do this in the use case, never in the route file, and never rely on the client
not asking.

---

## Errors

One type, `src/core/errors.ts`:

```ts
throw ApiError.badRequest('Quantity must be positive.');   // 400
throw ApiError.unauthorized('Session expired.');           // 401
throw ApiError.forbidden('Administrator access required.');// 403
throw ApiError.notFound('No such product.');               // 404
throw ApiError.tooLarge('That file is too big.');          // 413
throw ApiError.upstream('The assistant is unavailable right now.'); // 502
```

`withErrors(...)` wraps every handler: an `ApiError` becomes its status with the
body `{ error: { code, message } }`; anything unexpected is logged server-side
and returned as a flat 500, so a database failure never leaks a connection
string to a browser. These messages are read by customers — write them like a
person, not a stack trace.

---

## Transactions

Anything that writes more than one table takes a transaction. Order creation is
the model to copy:

```ts
return tx(async (client) => {
  const order = await OrderRepository.create(client, …);
  for (const item of items) await OrderRepository.addItem(client, order.id, item);
  await OrderRepository.addHistory(client, order.id, 'pending', null);
  return order;
});
```

`tx()` (in `src/db/pool.ts`) issues `BEGIN`, and on any thrown error
`ROLLBACK` before rethrowing. There is no state in which an order exists
without its items. Prices are recomputed server-side inside that transaction —
the client's totals are never trusted.

---

## Configuration

`src/core/config.ts` reads and validates the environment once, with Zod. A
missing or too-short `JWT_SECRET` stops the process with a clear message rather
than failing inside a handler at 2am. Add new settings there, with a sensible
default where one exists, and document them in `.env.example`.

---

## Uploads

Design files are written under `UPLOAD_DIR` with generated names; the original
filename is stored as data, never used as a path. `GET /api/v1/uploads/…` serves
them only to the owner or the admin, always with
`Content-Disposition: attachment` and a locked-down CSP, so an uploaded SVG or
HTML file can never execute in your customers' browsers.

---

## Background tasks

`npm run tasks` runs one pass of `src/tasks/`:

- **`cleanup.task.ts`** — clears expired password reset tokens and deletes
  orphan upload files older than 24 hours.
- **`reindex.task.ts`** — finds knowledge entries whose `updated_at` is newer
  than their newest embedding, asks the AI service for fresh vectors, and writes
  them. This is what makes "save a note, the assistant learns it" true.

Put it on a cron every ten minutes:

```cron
*/10 * * * * cd /srv/printshop/backend && /usr/bin/npm run tasks >> /var/log/printshop-tasks.log 2>&1
```

To add one, write `src/tasks/your.task.ts` exporting an async function and call
it from `scripts/run-tasks.ts`. Two rules: log failures and keep going (a task
that throws on one bad row stops doing its job forever), and make each pass
idempotent, because it will run again.

---

## API documentation

The OpenAPI 3.1 document is hand-maintained in `src/api/docs/openapi.ts`, served
raw at `/api-docs/openapi.json` and rendered by Swagger UI at `/docs`. Every new
endpoint needs an entry there. "Try it out" works: paste a token from
`POST /api/v1/auth/login` into **Authorize**.

---

## Build and run

```bash
npm install
npm run dev            # http://localhost:8080, Swagger at /docs
npm run migrate        # apply migrations/
npm run seed:admin     # create the single admin account
npm run tasks          # one maintenance pass
npm run typecheck      # tsc --noEmit
npm run build && npm start   # production
```
