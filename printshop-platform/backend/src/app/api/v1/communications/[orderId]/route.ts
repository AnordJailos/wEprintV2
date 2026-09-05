import type { NextRequest } from 'next/server';

import { sendEmailSchema } from '@/api/dto';
import { requireAdmin, requireUser } from '@/core/auth';
import { withErrors } from '@/core/errors';
import { created, list, readId, readJson } from '@/core/http';
import { CommunicationUseCase } from '@/use_case/communication.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ orderId: string }> };

export const GET = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(req);
  const { orderId } = await ctx.params;
  return list(await CommunicationUseCase.list(user, readId(orderId, 'order id')));
});

/** Owner only: the studio writes to the customer, not the other way round. */
export const POST = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin(req);
  const { orderId } = await ctx.params;
  const body = await readJson(req, sendEmailSchema);
  return created(await CommunicationUseCase.sendEmail(admin, readId(orderId, 'order id'), body));
});
