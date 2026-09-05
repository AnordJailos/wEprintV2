# 04 — Database Layer

PostgreSQL 15+ with the `vector` extension. Eleven tables. All schema lives in
plain `.sql` files under `backend/migrations/` — no ORM-generated migrations, so
you can always read exactly what will run.

---

## Applying migrations

```bash
export DATABASE_URL="postgres://printshop:PASSWORD@localhost:5432/printshop"

psql "$DATABASE_URL" -f migrations/0001_init.sql        # schema, indexes, AI role
psql "$DATABASE_URL" -f migrations/0002_seed_data.sql   # starter catalogue (optional)
```

`0001` is idempotent — every statement is `IF NOT EXISTS` or guarded — so
re-running it on a live database is safe and does nothing.

### Writing a new migration

1. Create `migrations/000N_short_description.sql`. Never edit an applied file:
   your database and someone else's would silently diverge.
2. Make it idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
3. Update the matching entity in `backend/src/entities/`. SeaORM entities are
   hand-written here, so the compiler will not notice a mismatch — the runtime
   will, with a "column does not exist" error.
4. Note it in this file's table list below.

Order matters: apply the migration **before** deploying code that uses the new
column, and make the column nullable or defaulted so the old code still runs
during the changeover.

---

## Tables

### `users`

The people. One row per account.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial PK | |
| `name` | text | Display name |
| `email` | text UNIQUE | Stored lowercase; the login identifier |
| `password_hash` | text | Argon2id. Never a plaintext password, ever |
| `phone` | text NULL | Used for the WhatsApp link |
| `role` | text | `customer` or `admin`, CHECK-constrained |
| `reset_token` | text NULL | Single-use password reset token |
| `reset_token_expires_at` | timestamptz NULL | Cleared hourly by a background task |
| `created_at` | timestamptz | |

**`users_single_admin`** — a partial unique index on `role WHERE role = 'admin'`.
This is the hard guarantee behind D-7: a second admin insert fails at the
database, no matter what the application code says.

To hand the studio to someone else, do not add an admin — change the existing
row's email, or demote and re-seed:

```sql
UPDATE users SET role = 'customer' WHERE role = 'admin';
-- then: npm run seed:admin   with the new ADMIN_EMAIL
```

### `products` and `product_options`

The catalogue. `products.base_price` is the starting price; each
`product_options` row carries a `price_delta` against it, grouped by
`option_group` (`size`, `stock`, `finish`, …).

`is_active = false` retires a product without breaking the orders that
reference it. Prefer that to `DELETE` — the foreign key from `order_items` is
`ON DELETE RESTRICT` and will refuse anyway.

### `designs`

Customer artwork uploads. The file itself lives on disk under `UPLOAD_DIR`; the
row stores `file_url`, `mime_type` and `size_bytes`. Deleting the row does not
delete the file — see [10-maintenance.md](10-maintenance.md#orphaned-uploads).

### `orders`, `order_items`, `order_status_history`

The heart of it.

`orders.status` is CHECK-constrained to the seven lifecycle values; so is
`payment_status` to four. Adding a stage means altering the constraint **and**
the stage list the frontend renders:

```sql
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('received','artwork_review','proofing','printing',
                    'finishing','quality_check','delivered','cancelled'));
```

`order_items.product_name` and `unit_price` are **denormalised on purpose**. An
order is a historical record: raising a price next month must not rewrite what
last month's invoice says.

`order_status_history` is append-only. Never update or delete a row here; it is
the audit trail the customer sees as their timeline.

An order is written transactionally: the `orders` row, all `order_items`, and
the opening history entry either all land or none do
([05-backend.md](05-backend.md#transactions)).

### `communications`

Per-order message thread. `sender` is `studio` or `customer`; `channel` records
whether it went through the app, email or WhatsApp.

### `knowledge_base_entries` and `knowledge_base_embeddings`

What the assistant knows.

An **entry** is human-written: title, content, category, published flag. A
**chunk** is machine-derived: 150 words of an entry plus a 384-dimension vector.
One entry produces many chunks.

`UNIQUE (knowledge_base_entry_id, chunk_index)` makes reindexing an upsert
rather than a duplicate-maker.

**The dimension number is load-bearing.** `VECTOR(384)` matches
`all-MiniLM-L6-v2`. Change the model and you must change this column and
re-embed everything — vectors from two models are not comparable, and mixing
them produces confidently wrong retrieval rather than an error.

```sql
-- changing embedding model, the whole procedure:
DELETE FROM knowledge_base_embeddings;
ALTER TABLE knowledge_base_embeddings ALTER COLUMN embedding TYPE vector(768);
-- update EMBEDDING_MODEL and EMBEDDING_DIMENSIONS in ai-service/.env, restart,
-- then let the reindex task catch up (or force it, see 06-ai-service.md).
REINDEX INDEX kbe_vec_idx;
```

The `kbe_vec_idx` HNSW index makes nearest-neighbour search fast. After a bulk
reindex, rebuild it.

---

## The two database credentials

| Role | Used by | Privileges |
| --- | --- | --- |
| `printshop` | Next.js backend | Owner: full read/write on everything |
| `printshop_ai` | Python AI service | `SELECT` on the two knowledge tables only |

This split is Decision D-4. The AI service is the component most exposed to
untrusted input (customer questions), so it is the one given the least power.
Verify it periodically:

```sql
SELECT table_name, privilege_type
  FROM information_schema.role_table_grants
 WHERE grantee = 'printshop_ai';
-- expect: SELECT on knowledge_base_entries and knowledge_base_embeddings. Nothing else.
```

If you ever see `INSERT`, `UPDATE` or `DELETE` in that result, revoke it:

```sql
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM printshop_ai;
```

---

## Useful queries

```sql
-- Work queue by stage
SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY 2 DESC;

-- Revenue this month
SELECT SUM(total) FROM orders
 WHERE created_at >= date_trunc('month', NOW()) AND status <> 'cancelled';

-- Best sellers, last 90 days
SELECT oi.product_name, SUM(oi.quantity) AS units, SUM(oi.line_total) AS revenue
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
 WHERE o.created_at > NOW() - INTERVAL '90 days'
 GROUP BY 1 ORDER BY revenue DESC;

-- Knowledge entries the assistant has NOT learned yet
SELECT k.id, k.title FROM knowledge_base_entries k
  LEFT JOIN knowledge_base_embeddings e ON e.knowledge_base_entry_id = k.id
 WHERE k.is_published AND e.id IS NULL;

-- Orders sitting untouched for over a week
SELECT reference, status, created_at FROM orders
 WHERE status NOT IN ('delivered','cancelled') AND updated_at < NOW() - INTERVAL '7 days';
```

---

## Backups

Take them. Test restoring them.

```bash
# Nightly dump, compressed, dated
pg_dump "$DATABASE_URL" -Fc -f "/var/backups/printshop-$(date +%F).dump"

# Restore into a fresh database
createdb printshop_restore
pg_restore -d printshop_restore /var/backups/printshop-2026-07-30.dump
```

A dump that has never been restored is a guess, not a backup. Restore one into
a scratch database every quarter and count the orders.

Do not forget `UPLOAD_DIR` — the artwork files are not in the database:

```bash
tar czf "/var/backups/uploads-$(date +%F).tar.gz" backend/uploads/
```

Retention and automation: [10-maintenance.md](10-maintenance.md#backups).
