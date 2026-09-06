import type { NextRequest } from "next/server";

import { chatSchema } from "@/api/dto";
import { requireUser } from "@/core/auth";
import { ApiError, withErrors } from "@/core/errors";
import { ok, readJson } from "@/core/http";
import { allow, clientIp, LIMITS } from "@/core/rate-limit";
import { AiUseCase } from "@/use_case/ai.use-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signed-in only and rate limited. The assistant costs CPU on the sidecar, so an
 * anonymous endpoint here would be a free denial-of-service handle.
 */
export const POST = withErrors(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!allow(`chat:${user.id}:${clientIp(req)}`, LIMITS.chat)) throw ApiError.rateLimited();
  const body = await readJson(req, chatSchema);
  return ok(await AiUseCase.chat(body.question, body.conversation_id));
});
