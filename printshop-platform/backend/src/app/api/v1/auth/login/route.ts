import type { NextRequest } from 'next/server';

import { loginSchema } from '@/api/dto';
import { ApiError, withErrors } from '@/core/errors';
import { ok, readJson } from '@/core/http';
import { allow, clientIp, LIMITS } from '@/core/rate-limit';
import { AuthUseCase } from '@/use_case/auth.use-case';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withErrors(async (req: NextRequest) => {
  // Throttled per IP: brute forcing a password is the attack this endpoint faces.
  if (!allow(`login:${clientIp(req)}`, LIMITS.auth)) throw ApiError.rateLimited();
  const body = await readJson(req, loginSchema);
  return ok(await AuthUseCase.login(body));
});
