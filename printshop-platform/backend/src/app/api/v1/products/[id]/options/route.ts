import type { NextRequest } from "next/server";

import { createProductOptionSchema } from "@/api/dto";
import { requireAdmin } from "@/core/auth";
import { withErrors } from "@/core/errors";
import { created, readId, readJson } from "@/core/http";
import { ProductUseCase } from "@/use_case/product.use-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withErrors(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const body = await readJson(req, createProductOptionSchema);
  return created(await ProductUseCase.addOption(readId(id, "product id"), body));
});
