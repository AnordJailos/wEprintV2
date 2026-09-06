import type { NextRequest } from "next/server";

import { forgotPasswordSchema } from "@/api/dto";
import { config } from "@/core/config";
import { ApiError, withErrors } from "@/core/errors";
import { ok, readJson } from "@/core/http";
import { allow, clientIp, LIMITS } from "@/core/rate-limit";
import { AuthUseCase } from "@/use_case/auth.use-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withErrors(async (req: NextRequest) => {
  if (!allow(`forgot:${clientIp(req)}`, LIMITS.reset)) throw ApiError.rateLimited();
  const body = await readJson(req, forgotPasswordSchema);
  // The token is echoed in development only; production never returns it.
  return ok(await AuthUseCase.forgotPassword(body.email, !config().isProduction));
});
