/**
 * Read-only Postgres access.
 *
 * Decision D-4: this service connects as `printshop_ai`, a role holding SELECT
 * and nothing else. Even if a prompt-injection attempt reached this file, the
 * database would refuse to write. `readOnly()` also refuses non-SELECT text as
 * a second, in-process line of defence.
 */
import { Pool, type QueryResultRow } from "pg";

import { config } from "./config";

const globalForPg = globalThis as unknown as { __akAiPool?: Pool };

function pool(): Pool {
  if (!globalForPg.__akAiPool) {
    const connectionString = config().databaseUrl;
    globalForPg.__akAiPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: /sslmode=require|neon\.tech|supabase\.co|rds\.amazonaws\.com/.test(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
    });
    globalForPg.__akAiPool.on("error", (e) => console.error("[ai pg pool]", e.message));
  }
  return globalForPg.__akAiPool;
}

export async function readOnly<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (!/^\s*select\b/i.test(text)) {
    throw new Error("The AI service may only run SELECT statements.");
  }
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function ping(): Promise<boolean> {
  try {
    await readOnly("SELECT 1 AS ok");
    return true;
  } catch (e) {
    console.error("[ai pg ping]", e);
    return false;
  }
}
