import type { NextRequest } from 'next/server';

import { requireUser } from '@/core/auth';
import { withErrors } from '@/core/errors';
import { list, readId } from '@/core/http';
import { CommunicationUseCase } from '@/use_case/communication.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Alias of GET /communications/{orderId}. Ownership is checked in the use case. */
export const GET = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  return list(await CommunicationUseCase.list(user, readId(id, 'order id')));
});
