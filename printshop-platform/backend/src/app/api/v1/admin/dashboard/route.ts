import type { NextRequest } from 'next/server';

import { requireAdmin } from '@/core/auth';
import { withErrors } from '@/core/errors';
import { ok } from '@/core/http';
import { AdminUseCase } from '@/use_case/admin.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrors(async (req: NextRequest) => {
  await requireAdmin(req);
  return ok(await AdminUseCase.dashboard());
});
