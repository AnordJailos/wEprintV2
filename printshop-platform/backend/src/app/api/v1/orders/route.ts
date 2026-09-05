import type { NextRequest } from 'next/server';

import { createOrderSchema, orderQuerySchema } from '@/api/dto';
import { requireUser } from '@/core/auth';
import { ApiError, withErrors } from '@/core/errors';
import { created, list, pagination, readJson, readQuery } from '@/core/http';
import { allow, clientIp, LIMITS } from '@/core/rate-limit';
import { OrderUseCase } from '@/use_case/order.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A customer sees their own orders; the owner sees all of them. */
export const GET = withErrors(async (req: NextRequest) => {
  const user = await requireUser(req);
  const query = readQuery(req, orderQuerySchema);
  const page = pagination(query.page, query.per_page);
  const result = await OrderUseCase.list(user, {
    status: query.status,
    page: page.page,
    perPage: page.perPage,
    offset: page.offset,
  });
  return list(result.data, { page: result.page, per_page: result.per_page, total: result.total });
});

export const POST = withErrors(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!allow(`order:${user.id}:${clientIp(req)}`, LIMITS.write)) throw ApiError.rateLimited();
  const body = await readJson(req, createOrderSchema);
  return created(await OrderUseCase.create(user, body));
});
