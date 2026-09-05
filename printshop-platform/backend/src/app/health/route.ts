import { NextResponse } from 'next/server';

import { AiClient } from '@/ai/client';
import { one } from '@/db/pool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness plus the two dependencies that matter. Deliberately unauthenticated
 * and deliberately vague: it reports up/down, never versions or connection
 * strings.
 */
export async function GET() {
  const [db, ai] = await Promise.all([
    one('SELECT 1 AS ok')
      .then(() => true)
      .catch(() => false),
    AiClient.health().catch(() => false),
  ]);

  const status = db ? 'ok' : 'degraded';
  return NextResponse.json(
    { status, database: db ? 'up' : 'down', assistant: ai ? 'up' : 'down' },
    { status: db ? 200 : 503 },
  );
}
