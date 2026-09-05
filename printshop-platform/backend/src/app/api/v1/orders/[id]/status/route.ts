import type { NextRequest } from 'next/server';

import { updateOrderStatusSchema } from '@/api/dto';
import { requireAdmin } from '@/core/auth';
import { withErrors } from '@/core/errors';
import { ok, readId, readJson } from '@/core/http';
import { OrderUseCase } from '@/use_case/order.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Owner only. Moving an order forward is a studio action, not a customer one. */
export const PATCH = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const body = await readJson(req, updateOrderStatusSchema);
  return ok(await OrderUseCase.updateStatus(admin, readId(id, 'order id'), body));
});
