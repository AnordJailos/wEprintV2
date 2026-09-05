/**
 * The only door into this service.
 *
 * Every route calls `requireInternalKey` first. Comparison is timing-safe so a
 * caller cannot learn the secret one byte at a time.
 */
import { timingSafeEqual } from 'node:crypto';

import { config } from './config';

export function requireInternalKey(req: Request): void {
  const provided = req.headers.get('x-internal-key') ?? '';
  const expected = config().internalApiKey;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);

  if (!ok) {
    throw new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Invalid internal key.' } }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }
}

/** Turn a thrown Response into a response, anything else into a flat 500. */
export function toResponse(e: unknown): Response {
  if (e instanceof Response) return e;
  console.error('[ai-service]', e);
  return new Response(JSON.stringify({ error: { code: 'INTERNAL', message: 'The assistant failed.' } }), {
    status: 500,
    headers: { 'content-type': 'application/json' },
  });
}
