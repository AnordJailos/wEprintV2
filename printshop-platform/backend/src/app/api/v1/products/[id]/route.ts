import type { NextRequest } from "next/server";

import { updateProductSchema } from "@/api/dto";
import { optionalUser, requireAdmin } from "@/core/auth";
import { noContent, withErrors } from "@/core/errors";
import { ok, readId, readJson } from "@/core/http";
import { ProductUseCase } from "@/use_case/product.use-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** `id` may be a numeric id or a slug — the UI links by both. */
export const GET = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await optionalUser(req);
  return ok(await ProductUseCase.get(id, user?.role === "admin"));
});

export const PATCH = withErrors(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const body = await readJson(req, updateProductSchema);
  return ok(await ProductUseCase.update(readId(id, "product id"), body));
});

export const DELETE = withErrors(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  await ProductUseCase.archive(readId(id, "product id"));
  return noContent();
});
