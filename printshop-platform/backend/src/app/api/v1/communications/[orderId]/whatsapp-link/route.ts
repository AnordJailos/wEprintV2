import type { NextRequest } from 'next/server';

import { requireUser } from '@/core/auth';
import { withErrors } from '@/core/errors';
import { ok, readId } from '@/core/http';
import { CommunicationUseCase } from '@/use_case/communication.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ orderId: string }> };

/**
 * Returns a wa.me deep link. The owner gets a link to the customer; the customer
 * gets a link to the studio. Neither sees the other's number in the payload
 * beyond the link they are about to open.
 */
export const GET = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(req);
  const { orderId } = await ctx.params;
  return ok(await CommunicationUseCase.whatsappLink(user, readId(orderId, 'order id')));
});
