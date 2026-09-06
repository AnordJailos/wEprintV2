import type { NextRequest } from "next/server";

import { requireAdmin } from "@/core/auth";
import { withErrors } from "@/core/errors";
import { ok, readId } from "@/core/http";
import { AiUseCase } from "@/use_case/ai.use-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Decision D-5 in one request: the AI service returns vectors, this process
 * writes them. The sidecar's database credential is read-only.
 */
export const POST = withErrors(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  return ok(await AiUseCase.reindex(readId(id, "entry id")));
});
