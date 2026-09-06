import type { NextRequest } from "next/server";

import { updatePaymentStatusSchema } from "@/api/dto";
import { requireAdmin } from "@/core/auth";
import { withErrors } from "@/core/errors";
import { ok, readId, readJson } from "@/core/http";
import { OrderUseCase } from "@/use_case/order.use-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Owner only: only the studio can declare money received. */
export const PATCH = withErrors(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const body = await readJson(req, updatePaymentStatusSchema);
  return ok(await OrderUseCase.updatePaymentStatus(readId(id, "order id"), body.payment_status));
});
