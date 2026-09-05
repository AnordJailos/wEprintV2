/**
 * The single Postgres pool, plus a transaction helper.
 *
 * Every SQL statement in this codebase is parameterised ($1, $2 …). There is no
 * string interpolation of user input anywhere in `repository/` — that is the
 * whole defence against SQL injection and it is a rule, not a preference.
 */
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

import { config } from '@/core/config';

// Next.js re-evaluates modules on hot reload; keep one pool per process.
const globalForPg = globalThis as unknown as { __akPool?: Pool };

export function pool(): Pool {
  if (!globalForPg.__akPool) {
    const connectionString = config().databaseUrl;
    globalForPg.__akPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // Managed Postgres (Neon/Supabase/RDS) needs TLS; local dev usually doesn't.
      ssl: /sslmode=require|neon\.tech|supabase\.co|rds\.amazonaws\.com/.test(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
    });
    globalForPg.__akPool.on('error', (err) => console.error('[pg pool]', err.message));
  }
  return globalForPg.__akPool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function one<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function count(text: string, params: unknown[] = []): Promise<number> {
  const row = await one<{ count: string }>(text, params);
  return row ? Number(row.count) : 0;
}

/**
 * Run several statements atomically. `create_order` uses this: the order row,
 * its items and the opening timeline entry either all exist or none do.
 */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* connection already gone */
    }
    throw e;
  } finally {
    client.release();
  }
}

/** Only for one-shot CLI scripts (migrate, seed, tasks); the server never calls it. */
export async function closePool(): Promise<void> {
  if (globalForPg.__akPool) {
    await globalForPg.__akPool.end();
    globalForPg.__akPool = undefined;
  }
}
