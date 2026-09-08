/**
 * POST /api/v1/ai/chat/stream — the assistant, streamed.
 *
 * Identical access rules to `/ai/chat`: signed in, rate limited per user + IP.
 * The backend stays the only thing that can talk to the AI service (D-2/D-6);
 * this route simply relays that private stream to the browser as SSE.
 *
 * Failures before the first byte come back as the normal JSON error shape.
 * Failures after it arrive as an `error` event inside the stream, because the
 * status line is already on the wire by then.
 */
import { NextResponse, type NextRequest } from 'next/server';

import { AiClient } from '@/ai/client';
import { chatSchema } from '@/api/dto';
import { requireUser } from '@/core/auth';
import { ApiError, withErrors } from '@/core/errors';
import { readJson } from '@/core/http';
import { allow, clientIp, LIMITS } from '@/core/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withErrors(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!allow(`chat:${user.id}:${clientIp(req)}`, LIMITS.chat)) throw ApiError.rateLimited();
  const body = await readJson(req, chatSchema);

  const upstream = await AiClient.generateStream(
    { question: body.question, conversation_id: body.conversation_id },
    req.signal,
  );

  return new NextResponse(upstream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
});
