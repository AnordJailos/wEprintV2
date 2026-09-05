import type { NextRequest } from 'next/server';

import { createInspirationSchema, inspirationQuerySchema } from '@/api/dto';
import { requireAdmin } from '@/core/auth';
import { withErrors } from '@/core/errors';
import { created, list, readJson, readQuery } from '@/core/http';
import { InspirationUseCase } from '@/use_case/inspiration.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public: the board is part of the shopfront. */
export const GET = withErrors(async (req: NextRequest) => {
  const query = readQuery(req, inspirationQuerySchema);
  return list(await InspirationUseCase.list(query.tag));
});

export const POST = withErrors(async (req: NextRequest) => {
  await requireAdmin(req);
  const body = await readJson(req, createInspirationSchema);
  return created(await InspirationUseCase.create(body));
});
