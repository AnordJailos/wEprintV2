import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { config } from "@/core/config";
import { ApiError, withErrors } from "@/core/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  ai: "application/postscript",
  psd: "image/vnd.adobe.photoshop",
};

/**
 * Serves uploaded artwork. Two defences matter here:
 *
 *  1. Path traversal: only a single `<uuid>.<ext>` segment is accepted, and the
 *     resolved absolute path is re-checked to be inside the upload directory.
 *     `../../etc/passwd` never gets past the regex, let alone the resolve check.
 *  2. `Content-Disposition: attachment` plus a strict CSP, so an uploaded SVG or
 *     PDF is downloaded rather than executed in the studio's own origin.
 */
export const GET = withErrors(async (_req: NextRequest, ctx: Ctx) => {
  const { path: segments } = await ctx.params;
  if (segments.length !== 1) throw ApiError.notFound("No such file.");

  const name = segments[0]!;
  if (!/^[a-f0-9-]{36}\.[a-z0-9]{2,5}$/i.test(name)) throw ApiError.notFound("No such file.");

  const dir = path.resolve(config().uploadDir);
  const full = path.resolve(dir, name);
  if (!full.startsWith(dir + path.sep)) throw ApiError.notFound("No such file.");
  if (!existsSync(full) || !statSync(full).isFile()) throw ApiError.notFound("No such file.");

  const ext = name.split(".").pop()!.toLowerCase();
  const stream = createReadStream(full) as unknown as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "content-length": String(statSync(full).size),
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, max-age=3600",
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
});
