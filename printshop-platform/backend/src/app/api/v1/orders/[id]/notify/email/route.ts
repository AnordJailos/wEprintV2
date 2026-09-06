import type { NextRequest } from "next/server";

import { sendEmailSchema } from "@/api/dto";
import { requireAdmin } from "@/core/auth";
import { withErrors } from "@/core/errors";
import { ok, readId, readJson } from "@/core/http";
import { CommunicationUseCase } from "@/use_case/communication.use-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Owner only. Returns `{ sent, communication }` — the shape the admin UI reads. */
export const POST = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const body = await readJson(req, sendEmailSchema);
  const communication = await CommunicationUseCase.sendEmail(admin, readId(id, "order id"), body);
  return ok({ sent: true, communication });
});
