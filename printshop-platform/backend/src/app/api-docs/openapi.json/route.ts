import { NextResponse } from "next/server";

import { openApiDocument } from "@/api/docs/openapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The machine-readable contract. Public: it documents, it does not disclose. */
export function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.json(openApiDocument(`${url.protocol}//${url.host}`), {
    headers: { "cache-control": "public, max-age=300" },
  });
}
