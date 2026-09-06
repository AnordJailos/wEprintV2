import type { NextRequest } from "next/server";

import { requireUser } from "@/core/auth";
import { withErrors } from "@/core/errors";
import { ok } from "@/core/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tokens are stateless, so signing out is the client discarding its token. The
 * endpoint exists so the app has one place to call, and so a future denylist can
 * be added here without touching the frontend.
 */
export const POST = withErrors(async (req: NextRequest) => {
  await requireUser(req);
  return ok({ message: "Signed out." });
});
