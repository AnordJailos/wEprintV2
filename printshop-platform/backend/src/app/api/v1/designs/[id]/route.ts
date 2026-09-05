import type { NextRequest } from 'next/server';

import { requireUser } from '@/core/auth';
import { noContent, withErrors } from '@/core/errors';
import { ok, readId } from '@/core/http';
import { DesignUseCase } from '@/use_case/design.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  return ok(await DesignUseCase.get(user, readId(id, 'design id')));
});

export const DELETE = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  await DesignUseCase.remove(user, readId(id, 'design id'));
  return noContent();
});
