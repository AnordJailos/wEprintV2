import type { NextRequest } from 'next/server';

import { requireUser } from '@/core/auth';
import { withErrors } from '@/core/errors';
import { ok, readId } from '@/core/http';
import { CommunicationUseCase } from '@/use_case/communication.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST because it logs a communication row. Returns `url` (the name the UI
 * reads) alongside `link` so both spellings work.
 */
export const POST = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const result = await CommunicationUseCase.whatsappLink(user, readId(id, 'order id'));
  return ok({ url: result.link, ...result });
});
