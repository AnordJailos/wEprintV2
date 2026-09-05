/**
 * Answer a customer question from the studio's own notes.
 *
 * Retrieve → filter by distance → ground the answer. No passages means the
 * service says it does not know; it never falls back to general knowledge.
 */
import { z } from 'zod';

import { generate } from '@/lib/generate';
import { requireInternalKey, toResponse } from '@/lib/guard';
import { retrieve } from '@/lib/retrieval';

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
        { error: { code: 'BAD_REQUEST', message: 'A question between 3 and 1000 characters is required.' } },
        { status: 400 },
      );
    }

    const passages = await retrieve(parsed.data.question);
    const { answer, sources } = await generate(parsed.data.question, passages);
    return Response.json({ answer, sources });
  } catch (e) {
    return toResponse(e);
  }
}
