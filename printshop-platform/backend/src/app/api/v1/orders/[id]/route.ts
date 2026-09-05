import type { NextRequest } from 'next/server';

import { requireUser } from '@/core/auth';
import { withErrors } from '@/core/errors';
import { ok, readId } from '@/core/http';
import { OrderUseCase } from '@/use_case/order.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  return ok(await OrderUseCase.get(user, readId(id, 'order id')));
});
