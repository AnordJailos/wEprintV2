import type { NextRequest } from "next/server";

import { designQuerySchema } from "@/api/dto";
import { requireUser } from "@/core/auth";
import { ApiError, withErrors } from "@/core/errors";
import { created, list, readQuery } from "@/core/http";
import { allow, clientIp, LIMITS } from "@/core/rate-limit";
import { DesignUseCase } from "@/use_case/design.use-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrors(async (req: NextRequest) => {
  const user = await requireUser(req);
  const query = readQuery(req, designQuerySchema);
  return list(await DesignUseCase.list(user, query.order_id));
});

/**
 * The one multipart endpoint in the API. Field names: `file`, optional
 * `order_id`, optional `notes`.
 */
export const POST = withErrors(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!allow(`upload:${user.id}:${clientIp(req)}`, LIMITS.upload)) throw ApiError.rateLimited();

  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("multipart/form-data")) {
    throw ApiError.badRequest("Send the artwork as multipart/form-data.");
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw ApiError.badRequest('A "file" field is required.');

  const rawOrderId = form.get("order_id");
  const orderId =
    typeof rawOrderId === "string" && /^\d{1,9}$/.test(rawOrderId) ? Number(rawOrderId) : undefined;
  const rawNotes = form.get("notes");
  const notes = typeof rawNotes === "string" ? rawNotes.slice(0, 2000) : undefined;

  return created(await DesignUseCase.upload(user, { file, orderId, notes }));
});
