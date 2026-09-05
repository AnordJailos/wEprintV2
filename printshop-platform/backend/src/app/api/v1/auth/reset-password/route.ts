import type { NextRequest } from 'next/server';

import { resetPasswordSchema } from '@/api/dto';
import { ApiError, withErrors } from '@/core/errors';
import { ok, readJson } from '@/core/http';
import { allow, clientIp, LIMITS } from '@/core/rate-limit';
import { AuthUseCase } from '@/use_case/auth.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withErrors(async (req: NextRequest) => {
  if (!allow(`reset:${clientIp(req)}`, LIMITS.reset)) throw ApiError.rateLimited();
  const body = await readJson(req, resetPasswordSchema);
  return ok(await AuthUseCase.resetPassword(body.token, body.password));
});
