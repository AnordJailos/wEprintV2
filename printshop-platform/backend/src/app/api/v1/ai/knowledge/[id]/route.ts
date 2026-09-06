import type { NextRequest } from "next/server";

import { updateKnowledgeSchema } from "@/api/dto";
import { requireAdmin } from "@/core/auth";
import { noContent, withErrors } from "@/core/errors";
import { ok, readId, readJson } from "@/core/http";
import { AiUseCase } from "@/use_case/ai.use-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrors(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const body = await readJson(req, updateKnowledgeSchema);
  return ok(await AiUseCase.updateEntry(readId(id, "entry id"), body));
});

export const DELETE = withErrors(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  await AiUseCase.deleteEntry(readId(id, "entry id"));
  return noContent();
});
