-- ===========================================================================
-- AK IT'S TIME TO SHINE — schema
-- ===========================================================================
-- Run once, against an empty database:
--     psql "$DATABASE_URL" -f migrations/0001_init.sql
--
-- Table and column names are frozen: the frontend reads these exact field
-- names through the DTO mappers. Renaming anything here means editing
-- src/entities/types.ts, the repository SQL, and the frontend together.
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ------------------------------------------------------------------- users ---
CREATE TABLE IF NOT EXISTS users (
    id                     SERIAL PRIMARY KEY,
    name                   TEXT        NOT NULL,
    email                  TEXT        NOT NULL UNIQUE,
    password_hash          TEXT        NOT NULL,
    phone                  TEXT,
    role                   TEXT        NOT NULL DEFAULT 'customer'
                           CHECK (role IN ('customer', 'admin')),
    reset_token            TEXT,
    reset_token_expires_at TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Decision D-7, enforced by the database rather than by trust: there can only
-- ever be one row with role = 'admin'.
CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin
    ON users ((role)) WHERE role = 'admin';

CREATE INDEX IF NOT EXISTS users_reset_token_idx ON users (reset_token)
    WHERE reset_token IS NOT NULL;

-- ---------------------------------------------------------------- products ---
CREATE TABLE IF NOT EXISTS products (
    id           SERIAL PRIMARY KEY,
    name         TEXT          NOT NULL,
    slug         TEXT          NOT NULL UNIQUE,
    category     TEXT          NOT NULL,
    description  TEXT          NOT NULL DEFAULT '',
    base_price   NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
    lead_time    TEXT          NOT NULL DEFAULT '3-5 days',
    image_url    TEXT,
    is_available BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_category_idx  ON products (category);
CREATE INDEX IF NOT EXISTS products_available_idx ON products (is_available);

CREATE TABLE IF NOT EXISTS product_options (
    id           SERIAL PRIMARY KEY,
    product_id   INTEGER       NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    option_type  TEXT          NOT NULL,
    option_value TEXT          NOT NULL,
    swatch       TEXT,
    price_delta  NUMERIC(12,2) NOT NULL DEFAULT 0,
    sort_order   INTEGER       NOT NULL DEFAULT 0,
    UNIQUE (product_id, option_type, option_value)
);

CREATE INDEX IF NOT EXISTS product_options_product_idx ON product_options (product_id);

-- ----------------------------------------------------------------- designs ---
CREATE TABLE IF NOT EXISTS designs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    order_id    INTEGER,
    file_name   TEXT        NOT NULL,
    file_path   TEXT        NOT NULL,
    mime_type   TEXT        NOT NULL,
    size_bytes  BIGINT      NOT NULL CHECK (size_bytes >= 0),
    notes       TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS designs_user_idx  ON designs (user_id);
CREATE INDEX IF NOT EXISTS designs_order_idx ON designs (order_id);

-- ------------------------------------------------------------- inspiration ---
CREATE TABLE IF NOT EXISTS inspiration_items (
    id           SERIAL PRIMARY KEY,
    title        TEXT        NOT NULL,
    source       TEXT        NOT NULL DEFAULT 'pinterest',
    external_url TEXT        NOT NULL,
    image_url    TEXT        NOT NULL,
    tags         TEXT        NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------ orders ---
CREATE TABLE IF NOT EXISTS orders (
    id             SERIAL PRIMARY KEY,
    reference      TEXT          NOT NULL UNIQUE,
    user_id        INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    design_id      INTEGER       REFERENCES designs (id) ON DELETE SET NULL,
    status         TEXT          NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','in_production',
                                     'quality_check','ready','delivered','cancelled')),
    payment_status TEXT          NOT NULL DEFAULT 'unpaid'
                   CHECK (payment_status IN ('unpaid','deposit','paid','refunded')),
    total          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_user_idx    ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx  ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);

-- designs.order_id points back at orders; added after both tables exist.
ALTER TABLE designs
    DROP CONSTRAINT IF EXISTS designs_order_id_fkey;
ALTER TABLE designs
    ADD CONSTRAINT designs_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS order_items (
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER       NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id   INTEGER       NOT NULL REFERENCES products (id),
    product_name TEXT          NOT NULL,
    quantity     INTEGER       NOT NULL CHECK (quantity > 0),
    unit_price   NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    options      JSONB         NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER     NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    status     TEXT        NOT NULL,
    note       TEXT,
    changed_by INTEGER     REFERENCES users (id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_status_history_order_idx
    ON order_status_history (order_id, changed_at);

-- ---------------------------------------------------------- communications ---
CREATE TABLE IF NOT EXISTS communications (
    id       SERIAL PRIMARY KEY,
    order_id INTEGER     NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    channel  TEXT        NOT NULL CHECK (channel IN ('whatsapp','email')),
    summary  TEXT        NOT NULL,
    payload  TEXT,
    sent_by  INTEGER     REFERENCES users (id) ON DELETE SET NULL,
    sent_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS communications_order_idx ON communications (order_id, sent_at);

-- ---------------------------------------------------------- knowledge base ---
CREATE TABLE IF NOT EXISTS knowledge_base_entries (
    id           SERIAL PRIMARY KEY,
    title        TEXT        NOT NULL,
    content      TEXT        NOT NULL,
    category     TEXT,
    is_published BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 384 dimensions: sentence-transformers/all-MiniLM-L6-v2. Changing the model
-- means changing this number and re-running every reindex.
CREATE TABLE IF NOT EXISTS knowledge_base_embeddings (
    id                      SERIAL PRIMARY KEY,
    knowledge_base_entry_id INTEGER     NOT NULL
                            REFERENCES knowledge_base_entries (id) ON DELETE CASCADE,
    chunk_index             INTEGER     NOT NULL,
    chunk_text              TEXT        NOT NULL,
    embedding               VECTOR(384) NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (knowledge_base_entry_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS knowledge_embeddings_entry_idx
    ON knowledge_base_embeddings (knowledge_base_entry_id);

-- Cosine distance, matching the `<=>` operator used by the AI service.
CREATE INDEX IF NOT EXISTS knowledge_embeddings_vector_idx
    ON knowledge_base_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
