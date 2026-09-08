/**
 * Streaming twin of `/internal/ai/generate`.
 *
 * Same retrieval, same grounding, same internal-key door. The only difference
 * is the wire format: Server-Sent Events instead of one JSON object, so the
 * customer reads the answer while it is being written.
 */
import { z } from 'zod';

import { requireInternalKey, toResponse } from '@/lib/guard';
import { retrieve } from '@/lib/retrieval';
import { sseResponse } from '@/lib/stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  question: z.string().trim().min(3).max(1000),
  conversation_id: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  try {
    requireInternalKey(req);

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'A question between 3 and 1000 characters is required.',
          },
        },
        { status: 400 },
      );
    }

    // Retrieval is fast and must be able to fail loudly with a normal JSON
    // error, so it happens before the stream is opened.
    const passages = await retrieve(parsed.data.question);
    return sseResponse(parsed.data.question, passages, req.signal);
  } catch (e) {
    return toResponse(e);
  }
}
