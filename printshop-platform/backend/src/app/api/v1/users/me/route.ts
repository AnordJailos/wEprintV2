import type { NextRequest } from 'next/server';

import { updateProfileSchema } from '@/api/dto';
import { requireUser } from '@/core/auth';
import { withErrors } from '@/core/errors';
import { ok, readJson } from '@/core/http';
import { UserUseCase } from '@/use_case/user.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrors(async (req: NextRequest) => {
  const user = await requireUser(req);
  return ok(await UserUseCase.me(user.id));
});

export const PATCH = withErrors(async (req: NextRequest) => {
  const user = await requireUser(req);
  const body = await readJson(req, updateProfileSchema);
  return ok(await UserUseCase.update(user.id, body));
});
