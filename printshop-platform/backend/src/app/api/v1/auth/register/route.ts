import type { NextRequest } from 'next/server';

import { registerSchema } from '@/api/dto';
import { withErrors } from '@/core/errors';
import { created, readJson } from '@/core/http';
import { allow, clientIp, LIMITS } from '@/core/rate-limit';
import { ApiError } from '@/core/errors';
import { AuthUseCase } from '@/use_case/auth.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withErrors(async (req: NextRequest) => {
  if (!allow(`register:${clientIp(req)}`, LIMITS.auth)) throw ApiError.rateLimited();
  const body = await readJson(req, registerSchema);
  return created(await AuthUseCase.register(body));
});
