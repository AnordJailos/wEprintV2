import type { NextRequest } from 'next/server';

import { createProductSchema, productQuerySchema } from '@/api/dto';
import { optionalUser, requireAdmin } from '@/core/auth';
import { withErrors } from '@/core/errors';
import { created, list, pagination, readJson, readQuery } from '@/core/http';
import { ProductUseCase } from '@/use_case/product.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public. The admin additionally sees archived products. */
export const GET = withErrors(async (req: NextRequest) => {
  const query = readQuery(req, productQuerySchema);
  const user = await optionalUser(req);
  const page = pagination(query.page, query.per_page);
  const result = await ProductUseCase.list({
    category: query.category,
    search: query.search,
    page: page.page,
    perPage: page.perPage,
    offset: page.offset,
    includeInactive: user?.role === 'admin',
  });
  return list(result.data, { page: result.page, per_page: result.per_page, total: result.total });
});

export const POST = withErrors(async (req: NextRequest) => {
  await requireAdmin(req);
  const body = await readJson(req, createProductSchema);
  return created(await ProductUseCase.create(body));
});
