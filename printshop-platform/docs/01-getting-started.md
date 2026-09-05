# 01 — Getting Started

From a bare machine to a running studio in about twenty minutes. Follow the
steps in order; each one ends with a check you can run.

---

## 0. What you need installed

| Tool | Version | Check | Where |
| --- | --- | --- | --- |
| PostgreSQL | 15 or newer | `psql --version` | postgresql.org/download |
| pgvector | 0.7+ | see step 1 | github.com/pgvector/pgvector |
| Node.js | 20.11+ (22 recommended) | `node --version` | nodejs.org |
| npm | 10+ | `npm --version` | ships with Node |

On Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib postgresql-15-pgvector build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
```

On macOS:

```bash
brew install postgresql@15 pgvector node
brew services start postgresql@15
```

---

## 1. Create the database

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE printshop LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE printshop OWNER printshop;
SQL

psql "postgres://printshop:choose-a-strong-password@localhost:5432/printshop" \
     -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Check:** the last command prints `CREATE EXTENSION` (or a notice that it
already exists). If it errors with *"could not open extension control file"*,
pgvector is not installed — go back and install it.

---

## 2. Apply the schema

```bash
cd printshop-platform/backend
export DATABASE_URL="postgres://printshop:choose-a-strong-password@localhost:5432/printshop"

psql "$DATABASE_URL" -f migrations/0001_init.sql
psql "$DATABASE_URL" -f migrations/0002_seed_data.sql    # optional starter catalogue
```

Then set a real password for the AI service's read-only role:

```bash
psql "$DATABASE_URL" -c "ALTER ROLE printshop_ai PASSWORD 'a-different-strong-password';"
```

**Check:** `psql "$DATABASE_URL" -c '\dt'` lists eleven tables.

Full column-by-column reference: [04-database.md](04-database.md).

---

## 3. Configure and start the backend

```bash
cd printshop-platform/backend
cp .env.example .env
```

Edit `.env`. The four that matter on day one:

```ini
DATABASE_URL=postgres://printshop:choose-a-strong-password@localhost:5432/printshop
JWT_SECRET=<paste the output of: openssl rand -hex 48>
ADMIN_EMAIL=you@yourstudio.com
ADMIN_PASSWORD=<at least 12 characters>
```

Create your administrator account, then run the server:

```bash
npm install
npm run migrate             # if you have not applied the schema yet
npm run seed:admin          # prints "Administrator you@yourstudio.com created."
npm run dev                 # http://localhost:8080
```

**Check:** `curl http://localhost:8080/health` returns `{"status":"ok"}`.
Open <http://localhost:8080/docs> for the interactive API reference.

Now delete `ADMIN_PASSWORD` from `.env` — the account exists, the file no
longer needs the secret.

---

## 4. Start the AI service

In a second terminal:

```bash
cd printshop-platform/ai-service
npm install
cp .env.example .env
```

Set `AI_DATABASE_URL` in that `.env` to the `printshop_ai` password you chose
in step 2, then:

```bash
npm run warmup      # downloads the embedding model once (~90MB)
npm run dev
```

The model is cached in `TRANSFORMERS_CACHE` (`./.model-cache` by default), so
later starts take seconds. `INTERNAL_API_KEY` in this `.env` must match the
backend's exactly, or every AI call returns 403.

**Check:** `curl http://localhost:8000/health` returns `{"status":"ok", ...}`.

The assistant has no knowledge until entries are indexed — see
[06-ai-service.md](06-ai-service.md#teaching-the-assistant).

---

## 5. Start the frontend

In a third terminal, from the repository root:

```bash
npm install
npm run dev
```

**Check:** open <http://localhost:8080> — you should see the studio home page.
Sign in at `/auth` with the admin email and password from step 3, and `/admin`
will open the studio console.

---

## Running everything at once

Three terminals gets tiring. A minimal `docker-compose.yml` and systemd unit
files are in [09-deployment.md](09-deployment.md).

---

## If something did not work

| Symptom | Cause | Fix |
| --- | --- | --- |
| `missing required env var: JWT_SECRET` | `.env` not filled in | Step 3 |
| `relation "users" does not exist` | Migrations not applied | Step 2 |
| `type "vector" does not exist` | pgvector extension missing | Step 1 |
| Frontend shows data but backend is off | Demo fallback in `src/lib/api.ts` | Expected — start the backend |
| `Refusing to seed: ADMIN_PASSWORD must be at least 12 characters` | Password too short | Lengthen it |
| Assistant answers "I don't have that in the studio's notes yet" | Nothing indexed | [06-ai-service.md](06-ai-service.md#teaching-the-assistant) |

More in [10-maintenance.md](10-maintenance.md#troubleshooting).
