# AK IT'S TIME TO SHINE — Windows Setup Instructions

Three parts, one database. Everything is Node.js now: the backend API and AI service are both Next.js apps, while the customer site is a React (TanStack) app.

```text
frontend (React)  ──HTTPS──▶  backend (Next.js, :8080)  ──localhost──▶  ai-service (Next.js, :8000)
                                      │                                      │
                                      └──────── PostgreSQL + pgvector ───────┘
                                               read/write          read-only
```

| Part        | Folder                          | Port          | Role                                                                         |
| ----------- | ------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| Backend API | `printshop-platform\backend`    | 8080          | All 34 public endpoints, `/docs` Swagger UI, the only writer to the database |
| AI service  | `printshop-platform\ai-service` | 8000          | RAG: chunk, embed, retrieve, answer. Private, read-only DB role              |
| Frontend    | repository root (`src\`)        | 5173/8080 dev | Customer + admin UI                                                          |

---

## 0. Prerequisites

Install the following on Windows:

* Node.js 20.11+ (Node.js 22 recommended)
* npm
* PostgreSQL 15+
* PostgreSQL `pgvector` extension
* Git
* PowerShell

Verify Node.js and npm:

```powershell
node --version
npm --version
```

Verify PostgreSQL:

```powershell
psql --version
```

Make sure PostgreSQL is running before continuing.

---

## 1. Database

Open **PowerShell**.

Create the database:

```powershell
createdb -U postgres printshop
```

Connect to the database:

```powershell
psql -U postgres -d printshop
```

Inside `psql`, enable pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Create the application database user:

```sql
CREATE ROLE printshop LOGIN PASSWORD 'printshop';
```

Grant access to the public schema:

```sql
GRANT ALL ON SCHEMA public TO printshop;
```

Exit PostgreSQL:

```sql
\q
```

### Apply the backend schema

Move into the backend:

```powershell
cd printshop-platform\backend
```

Copy the environment file:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and configure `DATABASE_URL` before continuing.

Install dependencies:

```powershell
npm install
```

Apply the migrations:

```powershell
npm run migrate
```

This applies migrations `0001` and `0002`.

Then apply the AI read-only role:

```powershell
psql -U postgres -d printshop -f migrations\0003_ai_readonly_role.sql
```

Migration `0003` creates `printshop_ai`, which has `SELECT` access to the two knowledge tables and nothing else.

**Change the ****`printshop_ai`**** password before production.**

Never give the AI service the `printshop` database credential.

For table-by-table details, see:

`docs\04-database.md`

---

## 2. Backend API — Port 8080

Edit:

```text
printshop-platform\backend\.env
```

Configure:

| Variable                 | What to put                                     |
| ------------------------ | ----------------------------------------------- |
| `DATABASE_URL`           | The read/write database credential              |
| `JWT_SECRET`             | 32+ random characters                           |
| `PUBLIC_BASE_URL`        | `http://localhost:8080` during development      |
| `CORS_ALLOWED_ORIGINS`   | Comma-separated frontend origins                |
| `AI_SERVICE_URL`         | `http://127.0.0.1:8000`                         |
| `INTERNAL_API_KEY`       | 16+ random characters; must match AI service    |
| `UPLOAD_DIR`             | Where design files are stored, e.g. `.\uploads` |
| `STUDIO_WHATSAPP_NUMBER` | Digits only, country code first                 |
| `ADMIN_EMAIL`            | Admin email used during initial seeding         |
| `ADMIN_PASSWORD`         | Admin password used during initial seeding      |

### Generate a JWT secret on Windows

PowerShell can generate a random value with:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

You can use the generated value for `JWT_SECRET`.

### Run the backend

```powershell
npm run dev
```

The backend should be available at:

```text
http://localhost:8080
```

Swagger UI:

```text
http://localhost:8080/docs
```

In another PowerShell window, create the admin account:

```powershell
npm run seed:admin
```

This should normally be run **once**.

There can only ever be one admin. A partial unique index in the database enforces this.

After successful seeding, remove `ADMIN_PASSWORD` from `.env`.

### Background maintenance

Run:

```powershell
npm run tasks
```

This handles background maintenance such as:

* Expiring reset tokens
* Sweeping orphan uploads
* Catching up knowledge-base vectors

For production, schedule this command using **Windows Task Scheduler** instead of Linux `cron`.

---

## 3. AI Service — Port 8000

From the backend directory:

```powershell
cd ..\ai-service
```

Copy the environment file:

```powershell
Copy-Item .env.example .env
```

Install dependencies:

```powershell
npm install
```

Download/warm the embedding model:

```powershell
npm run warmup
```

This downloads the embedding model once (approximately 90 MB).

Start the AI service:

```powershell
npm run dev
```

The AI service should be available at:

```text
http://127.0.0.1:8000
```

### AI service `.env`

Configure:

| Variable           | Value                                      |
| ------------------ | ------------------------------------------ |
| `AI_DATABASE_URL`  | The `printshop_ai` read-only database URL  |
| `INTERNAL_API_KEY` | Exactly the same value used by the backend |
| `MAX_DISTANCE`     | `0.7`                                      |
| `TOP_K`            | `5`                                        |
| `LLM_API_URL`      | Optional                                   |
| `LLM_API_KEY`      | Optional                                   |
| `LLM_MODEL`        | Optional                                   |

**Important:** `AI_DATABASE_URL` must use the `printshop_ai` database user.

Do **not** use the `printshop` read/write credential here.

If `LLM_API_URL` is empty, answers are extracted from your stored notes rather than generated by an external LLM.

The AI service should remain accessible only to the backend in production.

---

## 4. AI Service Smoke Test

From PowerShell:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```

For the authenticated AI endpoint:

```powershell
$headers = @{
    "content-type" = "application/json"
    "x-internal-key" = $env:INTERNAL_API_KEY
}

$body = @{
    question = "How long does a poster take?"
} | ConvertTo-Json

Invoke-WebRequest `
    -Uri http://127.0.0.1:8000/internal/ai/generate `
    -Method POST `
    -Headers $headers `
    -Body $body
```

If `INTERNAL_API_KEY` is not defined as a Windows environment variable, use the exact value from the AI service `.env` instead.

---

## 5. Frontend

Return to the repository root:

```powershell
cd ..\..
```

Install dependencies:

```powershell
npm install
```

Create or edit the root `.env`:

```text
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Start the frontend:

```powershell
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

The exact port may vary depending on the Vite configuration.

The frontend communicates with the backend through:

```text
http://localhost:8080/api/v1
```

If the backend is unavailable, the UI falls back to demo data instead of showing API errors. If the numbers look suspiciously round, check whether the backend is running.

---

## 6. Recommended Windows Startup Order

Open **three PowerShell terminals**.

### Terminal 1 — Backend

```powershell
cd printshop-platform\backend
npm run dev
```

### Terminal 2 — AI Service

```powershell
cd printshop-platform\ai-service
npm run dev
```

### Terminal 3 — Frontend

```powershell
cd printshop-platform
npm run dev
```

The resulting flow is:

```text
Browser
   │
   ▼
Frontend :5173
   │
   │ API requests
   ▼
Backend :8080
   │
   ├──────────────▶ PostgreSQL
   │                  │
   │                  └── pgvector
   │
   └──────────────▶ AI Service :8000
                         │
                         ▼
                    PostgreSQL
                    read-only
```

---

## 7. First-Run Checklist

* [ ] `node --version` works
* [ ] `npm --version` works
* [ ] `psql --version` works
* [ ] PostgreSQL is running
* [ ] `printshop` database exists
* [ ] `vector` extension is enabled
* [ ] `printshop` database user exists
* [ ] Backend migrations completed successfully
* [ ] `printshop_ai` read-only role exists
* [ ] Backend starts on port `8080`
* [ ] `http://localhost:8080/health` returns `{"status":"ok"}`
* [ ] `http://localhost:8080/docs` opens Swagger UI
* [ ] AI service starts on port `8000`
* [ ] `http://127.0.0.1:8000/health` reports database and model as ready
* [ ] Backend and AI service use the same `INTERNAL_API_KEY`
* [ ] AI service uses the `printshop_ai` database credential
* [ ] Admin can sign in
* [ ] A second admin cannot be created
* [ ] Frontend starts successfully
* [ ] Frontend can communicate with the backend
* [ ] A knowledge-base entry can be saved
* [ ] `npm run tasks` runs successfully
* [ ] The AI assistant returns a grounded answer
* [ ] The AI database user has only the required `SELECT` privileges

To verify the AI user's privileges:

```powershell
psql -U postgres -d printshop
```

Then:

```sql
SELECT privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'printshop_ai';
```

The result should contain only the intended `SELECT` privileges.

---

## Where to Go Next

| Question                             | Document                   |
| ------------------------------------ | -------------------------- |
| Day-to-day running of the studio     | `docs\02-owner-manual.md`  |
| Why the pieces are arranged this way | `docs\03-architecture.md`  |
| Tables, indexes, credentials         | `docs\04-database.md`      |
| Backend internals and endpoints      | `docs\05-backend.md`       |
| RAG behaviour and tuning             | `docs\06-ai-service.md`    |
| Frontend structure                   | `docs\07-frontend.md`      |
| Changing prices, colours, copy       | `docs\08-customization.md` |
| Going live                           | `docs\09-deployment.md`    |
| Backups, upgrades, troubleshooting   | `docs\10-maintenance.md`   |
