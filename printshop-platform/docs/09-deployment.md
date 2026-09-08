# 09 — Deployment

Everything is Node.js, so you have two sensible options: one Linux host with
systemd and nginx, or a managed Node/Next host (Vercel, Railway, Render, Fly).
Both are described below.

---

## 1. Build

```bash
cd printshop-platform/backend && npm ci && npm run build
cd ../ai-service            && npm ci && npm run build && npm run warmup
cd ../../                   && npm ci && npm run build   # frontend
```

`npm run warmup` downloads the embedding model once so the first customer
question is not the slow one.

---

## 2. Production environment

Backend `.env`: the real `DATABASE_URL`, a fresh `JWT_SECRET`
(`openssl rand -base64 48`), a fresh `INTERNAL_API_KEY`
(`openssl rand -hex 32`), `PUBLIC_BASE_URL=https://yourdomain.com`,
`CORS_ALLOWED_ORIGINS=https://yourdomain.com`, `STUDIO_WHATSAPP_NUMBER`, and
**no** `ADMIN_PASSWORD` once the account exists.

AI service `.env`: `AI_DATABASE_URL` using the **read-only** `printshop_ai`
role, the same `INTERNAL_API_KEY`, and `AI_HOST=127.0.0.1` — never `0.0.0.0`
(Decision D-6).

---

## 3. Option A — one host, systemd + nginx

`/etc/systemd/system/printshop-api.service`:

```ini
[Unit]
Description=AK Print Studio API
After=network.target postgresql.service

[Service]
User=printshop
WorkingDirectory=/srv/printshop/backend
EnvironmentFile=/srv/printshop/backend/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/printshop-ai.service`:

```ini
[Unit]
Description=AK Print Studio AI Service
After=network.target postgresql.service

[Service]
User=printshop
WorkingDirectory=/srv/printshop/ai-service
EnvironmentFile=/srv/printshop/ai-service/.env
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`HOSTNAME=127.0.0.1` is what actually keeps Next.js off the public interface.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now printshop-api printshop-ai
sudo systemctl status printshop-api
```

Maintenance on a timer (see [05-backend.md](05-backend.md#background-tasks)):

```cron
*/10 * * * * cd /srv/printshop/backend && /usr/bin/npm run tasks >> /var/log/printshop-tasks.log 2>&1
```

### nginx + TLS

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 30M;          # must exceed MAX_UPLOAD_BYTES

    location /api/  { proxy_pass http://127.0.0.1:8080; proxy_set_header Host $host; }
    location /docs  { proxy_pass http://127.0.0.1:8080; }
    location /api-docs/ { proxy_pass http://127.0.0.1:8080; }
    location /      { root /srv/printshop/frontend; try_files $uri /index.html; }
}
server { listen 80; server_name yourdomain.com; return 301 https://$host$request_uri; }
```

Note there is **no** `location` for port 8000. The AI service is never proxied.

`sudo certbot --nginx -d yourdomain.com`

---

## 4. Option B — managed Node hosting

Deploy `backend/` and `ai-service/` as two separate Node/Next projects and the
frontend as a static site.

- Set each project's environment variables from its `.env.example`.
- Point `AI_SERVICE_URL` at the AI project's private/internal URL. If the
  platform gives you only a public URL, the `x-internal-key` guard is then your
  single line of defence — make the key long and random, and never log it.
- The AI service needs a **persistent or pre-warmed** model cache. On platforms
  with an ephemeral filesystem, run `npm run warmup` as a post-deploy step, or
  set `TRANSFORMERS_CACHE` to a mounted volume; otherwise the first request
  after each cold start downloads ~90 MB.
- Uploads need a persistent volume too. A container filesystem that resets will
  lose customer design files — mount `UPLOAD_DIR`, or move to object storage.
- Run migrations from a one-off job, never automatically on boot.
- Replace the cron above with the platform's scheduler hitting `npm run tasks`.

---

## 5. Hardening checklist

- [ ] `JWT_SECRET` is new, 48+ chars, and not the one from `.env.example`
- [ ] `INTERNAL_API_KEY` is new, identical in both apps, and not in git
- [ ] `ADMIN_PASSWORD` removed from `.env` after seeding; only one admin exists
- [ ] Port 8000 (AI) is **not** reachable from outside — `curl` it from another host and expect a refusal
- [ ] Port 5432 (Postgres) is not public
- [ ] `printshop_ai` still has only `SELECT` ([04-database.md](04-database.md))
- [ ] `CORS_ALLOWED_ORIGINS` lists your real domain only; never `*`
- [ ] `.env` files are `chmod 600`, owned by the service user, never committed
- [ ] `npm audit` clean, or the findings are understood
- [ ] Nightly database dump **and** `UPLOAD_DIR` archive, tested by restoring once
- [ ] TLS certificate auto-renews (`systemctl status certbot.timer`)

---

## 6. Deploying an update

```bash
git pull
cd backend && npm ci && npm run migrate        # migrations first
npm run build && sudo systemctl restart printshop-api
cd ../ai-service && npm ci && npm run build && sudo systemctl restart printshop-ai
cd ../.. && npm ci && npm run build            # frontend bundle
curl -s https://yourdomain.com/api/v1/../health
```

Migrations before builds, always — new code expecting a missing column fails
harder than old code ignoring a new one.

### Frontend environment

The frontend needs exactly one variable at build time:

```bash
VITE_API_BASE_URL=https://yourdomain.com/api/v1 npm run build
```

When `VITE_API_BASE_URL` is set the app talks to the real backend and every
demo hint disappears — including the "Demo mode: any email works" note on the
sign-in page. When it is absent the app runs on built-in demo data and shows
those hints, which is correct for previews only.
