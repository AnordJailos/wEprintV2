# 08 — Customization Recipes

Ordered easiest to hardest. Each says which files to touch and what else must
change with them.

---

## Rename the studio

1. `backend/.env` → `STUDIO_NAME`
2. `ai-service/.env` → `STUDIO_NAME`
3. `src/components/SiteChrome.tsx` → the wordmark
4. `src/routes/__root.tsx` and every route's `head()` → titles
5. `src/assets/ak-logo.png` → replace the file, keep the name

No restart of the database needed; restart both services.

---

## Change the colours

`src/styles.css`, the token block at the top. Change the values, nothing else:

```css
--color-ink:    #14110f;   /* text and dark surfaces */
--color-canvas: #faf7f2;   /* the page */
--color-signal: #e8541f;   /* the single accent */
--color-thread: #d6cfc4;   /* rules and borders */
```

Every component inherits. If a colour will not change, something hardcoded a
hex — find it and replace it with a token.

---

## Add or reprice a product

Through the admin console, or directly:

```sql
INSERT INTO products (name, slug, description, category, base_price, unit, turnaround)
VALUES ('A1 Poster','a1-poster','Heavy 200gsm matte.','large-format',130.00,'each','2 working days');

INSERT INTO product_options (product_id, option_group, label, price_delta, sort_order)
SELECT id,'stock','Satin 250gsm',22.00,2 FROM products WHERE slug = 'a1-poster';
```

Repricing never rewrites history — `order_items` stores the price paid at the
time.

Retire with `UPDATE products SET is_active = false WHERE slug = '…';` rather
than deleting.

---

## Add an order stage

Three places, all required:

1. **Database** — extend the CHECK constraint
   ([04-database.md](04-database.md#orders-order_items-order_status_history)).
2. **Backend** — add the value to the status list validated in
   `use_case/order_use_case.rs`.
3. **Frontend** — add it to the stage list in `src/lib/demo-data.ts` and give it
   a style in `src/components/StatusStamp.tsx`.

Miss the frontend and the stage saves but renders unlabelled.

---

## Change the currency

Prices are `NUMERIC(10,2)` — currency-agnostic. Only formatting changes: find
the formatter in `src/lib/api.ts` / the components that render prices and change
the locale and currency code.

```ts
new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" })
```

---

## Make the assistant stricter or chattier

`ai-service/.env`:

```ini
MAX_DISTANCE=0.5   # stricter: says "I don't know" more, is wrong less
MAX_DISTANCE=0.9   # chattier: always answers, sometimes off-topic
```

Restart the AI service. No reindex needed — this is a query-time filter.

---

## Turn on a real language model for answers

`ai-service/.env`:

```ini
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

Any OpenAI-compatible endpoint works. Without a key the service still answers
extractively — this is an upgrade in prose, not in truthfulness. Restart.

---

## Change the assistant's tone

`ai-service/src/lib/generate.ts`, `SYSTEM_PROMPT`. Keep the two rules
that make it trustworthy: answer only from the passages, and use the exact
"I don't know" text when they are empty. Everything else is yours.

---

## Change the embedding model

The most invasive change here. Follow it exactly:

1. `ai-service/.env` → `EMBEDDING_MODEL` and `EMBEDDING_DIMENSIONS`.
2. `backend/migrations/` → new migration altering `embedding` to `vector(N)`.
3. Delete every existing embedding — old and new vectors are not comparable.
4. Restart the AI service, force a full reindex
   ([06-ai-service.md](06-ai-service.md#forcing-a-reindex)).
5. `REINDEX INDEX kbe_vec_idx;`

Skipping step 3 gives you confidently wrong retrieval with no error message.

---

## Raise the upload size limit

`backend/.env` → `MAX_UPLOAD_MB`. If a reverse proxy sits in front, raise its
limit too, or the request dies before reaching the backend:

```nginx
client_max_body_size 50M;
```

---

## Add a field to a table

1. New migration: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS rush BOOLEAN NOT NULL DEFAULT FALSE;`
2. Add the field to `backend/src/entities/order.rs` — SeaORM entities are
   hand-written, so the compiler will not warn you; a mismatch fails at runtime.
3. Expose it in the relevant `api/dto/`.
4. Use it in `use_case/`.
5. Render it in the frontend.

Always nullable or defaulted, so the currently-deployed code keeps working
during the rollout.

---

## Move the admin account to a new email

```sql
UPDATE users SET email = 'new@studio.com' WHERE role = 'admin';
```

Then update `ADMIN_EMAIL` in `backend/.env`. Do **not** insert a second admin —
the `users_single_admin` index will reject it, which is the intended behaviour.

---

## Add a new page

[07-frontend.md](07-frontend.md#adding-a-page).

## Add a new endpoint

[05-backend.md](05-backend.md#adding-an-endpoint).
