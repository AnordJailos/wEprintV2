/**
 * Applies every file in migrations/ in filename order, once each.
 *
 *     npm run migrate
 *
 * A `_migrations` table records what has already run, so this is safe to invoke
 * on every deploy. Each file runs inside its own transaction: a broken migration
 * leaves the database exactly as it was.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
  process.exit(1);
}

const dir = path.resolve(process.cwd(), 'migrations');

async function main() {
  const client = new Client({
    connectionString: url,
    ssl: /sslmode=require|neon\.tech|supabase\.co|rds\.amazonaws\.com/.test(url!)
      ? { rejectUnauthorized: false }
      : undefined,
  });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  const applied = new Set(
    (await client.query<{ name: string }>('SELECT name FROM _migrations')).rows.map((r) => r.name),
  );

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip  ${file}`);
      continue;
    }
    const sql = readFileSync(path.join(dir, file), 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  apply ${file}`);
      ran += 1;
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`\nMigration ${file} failed. Nothing from it was applied.\n`, e);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log(ran === 0 ? '\nDatabase already up to date.' : `\n${ran} migration(s) applied.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
