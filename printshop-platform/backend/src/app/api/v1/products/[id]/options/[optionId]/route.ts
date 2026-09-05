import type { NextRequest } from 'next/server';

import { requireAdmin } from '@/core/auth';
import { noContent, withErrors } from '@/core/errors';
import { readId } from '@/core/http';
import { ProductUseCase } from '@/use_case/product.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; optionId: string }> };

export const DELETE = withErrors(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin(req);
  const { id, optionId } = await ctx.params;
  await ProductUseCase.removeOption(readId(id, 'product id'), readId(optionId, 'option id'));
  return noContent();
});
