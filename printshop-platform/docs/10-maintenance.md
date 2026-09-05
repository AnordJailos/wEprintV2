# 10 — Maintenance

## Routine

**Daily (automated):** database dump, uploads archive, log rotation.

**Weekly (you):** skim `journalctl -u printshop-api --since '7 days ago' -p err`;
check for orders stuck over a week
([04-database.md](04-database.md#useful-queries)); confirm every published
knowledge entry has chunks.

**Monthly:** `npm outdated` and `npm audit` in `backend/`, `ai-service/` and the frontend,
`pip list --outdated`, and check disk on `UPLOAD_DIR`.

**Quarterly:** restore a backup into a scratch database and count the orders. A
backup you have not restored is a guess.

## Backups

```bash
#!/usr/bin/env bash
# /usr/local/bin/printshop-backup.sh   (cron: 0 2 * * *)
set -euo pipefail
D=$(date +%F)
pg_dump "$DATABASE_URL" -Fc -f "/var/backups/printshop/db-$D.dump"
tar czf "/var/backups/printshop/uploads-$D.tar.gz" -C /srv/printshop/backend uploads
find /var/backups/printshop -mtime +30 -delete
```

Copy them off the machine. A backup on the server that dies with the server is
not a backup.

Restore:

```bash
createdb printshop_restore
pg_restore -d printshop_restore /var/backups/printshop/db-2026-07-30.dump
psql -d printshop_restore -c 'SELECT COUNT(*) FROM orders;'
```

## Troubleshooting

| Symptom | Check | Fix |
| --- | --- | --- |
| Site loads, data is wrong/static | Backend down; frontend fell back to demo data | `systemctl status printshop-api` |
| 401 on every request | `JWT_SECRET` changed | Everyone signs in again; that is expected |
| 403 on `/admin` | Account is not the admin | `SELECT email, role FROM users WHERE role='admin';` |
| Cannot sign in as admin | Password lost | Re-run `npm run seed:admin` with a new `ADMIN_PASSWORD` |
| "second admin" insert fails | `users_single_admin` index, working as designed | Move the existing admin instead ([08](08-customization.md#move-the-admin-account-to-a-new-email)) |
| Assistant always says "I don't know" | Nothing indexed, or `MAX_DISTANCE` too low | [06-ai-service.md](06-ai-service.md#troubleshooting) |
| Assistant is off-topic | `MAX_DISTANCE` too high | Lower to 0.5 |
| Uploads fail at ~1MB | Proxy body limit | `client_max_body_size` in nginx |
| `dimension mismatch` on reindex | Model ≠ `VECTOR(n)` | [04-database.md](04-database.md) |
| `permission denied for table` in AI logs | Read-only role, by design | The write belongs in the backend |
| Slow product/order lists | Missing index after a schema change | `EXPLAIN ANALYZE` the query |

## Logs

```bash
journalctl -u printshop-api -f
journalctl -u printshop-ai  -f
journalctl -u printshop-api -p err --since today
```

Backend verbosity: `RUST_LOG=debug` in `.env` (noisy — revert after).

## Orphaned uploads

Deleting a design row does not delete its file (deliberate: an order may still
reference the artwork). Reconcile occasionally:

```sql
SELECT file_url FROM designs;   -- compare against ls of UPLOAD_DIR
```

Archive rather than delete anything younger than your longest order lifecycle.

## Health checks

```bash
curl -sf http://localhost:8080/health || echo "API DOWN"
curl -sf http://localhost:8000/health || echo "AI DOWN"
psql "$DATABASE_URL" -c 'SELECT 1' >/dev/null || echo "DB DOWN"
```

Wire these into whatever monitoring you use; the AI service being down degrades
the assistant only — orders keep working.

## Upgrading dependencies

Do one ecosystem at a time, on a branch, with a restore-tested backup:
`npm update` → `npm run typecheck` → `npm run build` in each app; then →
`npm run build`; then `pip install -U -r requirements.txt` → ask the assistant a
known question and compare the answer. Never upgrade the embedding model
casually — see [08-customization.md](08-customization.md#change-the-embedding-model).
