/**
 * Creates (or repairs) the single administrator account.
 *
 *     ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' npm run seed:admin
 *
 * Decision D-7: there is exactly one admin. The API's registration endpoint
 * hardcodes role 'customer', and the database enforces a partial unique index on
 * role = 'admin'. This script is the ONLY way an admin comes into existence.
 *
 * Run it once, then delete ADMIN_PASSWORD from your .env.
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { Client } from 'pg';

const url = process.env.DATABASE_URL;
const name = process.env.ADMIN_NAME ?? 'AK Admin';
const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? '';

if (!url) fail('DATABASE_URL is not set.');
if (!email) fail('ADMIN_EMAIL is not set.');
if (password.length < 10) fail('ADMIN_PASSWORD must be at least 10 characters.');

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Must match core/password.ts exactly, or the seeded admin cannot sign in. */
function hash(plain: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(plain.normalize('NFKC'), salt, 32, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$16384$8$1$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function main() {
  const client = new Client({
    connectionString: url,
    ssl: /sslmode=require|neon\.tech|supabase\.co|rds\.amazonaws\.com/.test(url!)
      ? { rejectUnauthorized: false }
      : undefined,
  });
  await client.connect();

  const existingAdmin = await client.query<{ id: number; email: string }>(
    "SELECT id, email FROM users WHERE role = 'admin' LIMIT 1",
  );

  if (existingAdmin.rows.length > 0 && existingAdmin.rows[0]!.email !== email) {
    console.error(
      `An administrator already exists (${existingAdmin.rows[0]!.email}).\n` +
        'There can only be one. To move the role to another address, do it deliberately in SQL.',
    );
    await client.end();
    process.exit(1);
  }

  const existingUser = await client.query<{ id: number }>('SELECT id FROM users WHERE email = $1', [email]);

  if (existingUser.rows.length > 0) {
    await client.query("UPDATE users SET name = $2, password_hash = $3, role = 'admin' WHERE id = $1", [
      existingUser.rows[0]!.id,
      name,
      hash(password),
    ]);
    console.log(`Administrator updated: ${email}`);
  } else {
    await client.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
      [name, email, hash(password)],
    );
    console.log(`Administrator created: ${email}`);
  }

  await client.end();
  console.log('Now remove ADMIN_PASSWORD from your .env file.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
