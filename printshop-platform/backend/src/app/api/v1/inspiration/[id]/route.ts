import type { NextRequest } from "next/server";

import { requireAdmin } from "@/core/auth";
import { noContent, withErrors } from "@/core/errors";
import { readId } from "@/core/http";
import { InspirationUseCase } from "@/use_case/inspiration.use-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = withErrors(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  await InspirationUseCase.remove(readId(id, "inspiration id"));
  return noContent();
});
