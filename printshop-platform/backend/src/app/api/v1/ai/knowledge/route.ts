import type { NextRequest } from 'next/server';

import { createKnowledgeSchema } from '@/api/dto';
import { requireAdmin } from '@/core/auth';
import { withErrors } from '@/core/errors';
import { created, list, readJson } from '@/core/http';
import { AiUseCase } from '@/use_case/ai.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Owner only. The knowledge base is what the assistant is allowed to say. */
export const GET = withErrors(async (req: NextRequest) => {
  await requireAdmin(req);
  return list(await AiUseCase.listEntries());
});

export const POST = withErrors(async (req: NextRequest) => {
  await requireAdmin(req);
  const body = await readJson(req, createKnowledgeSchema);
  return created(await AiUseCase.createEntry(body));
});
