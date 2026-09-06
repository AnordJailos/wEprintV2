/**
 * Small helpers shared by every route handler: JSON parsing that cannot be
 * tricked, query parsing, pagination, and consistent success responses.
 */
import { NextResponse } from "next/server";
import type { ZodTypeAny, output as ZodOutput } from "zod";

import { ApiError } from "./errors";

const MAX_JSON_BYTES = 256 * 1024; // an order with 100 lines is ~10KB

/** Read + validate a JSON body. Rejects wrong content type and oversized bodies. */
export async function readJson<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<ZodOutput<S>> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw ApiError.badRequest("Expected Content-Type: application/json.");
  }
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) throw ApiError.tooLarge("Request body is too large.");

  const raw = await req.text();
  if (raw.length > MAX_JSON_BYTES) throw ApiError.tooLarge("Request body is too large.");
  if (!raw) throw ApiError.badRequest("A JSON body is required.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw ApiError.badRequest("Body is not valid JSON.");
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw ApiError.badRequest(
      issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid body.",
    );
  }
  return result.data;
}

/** Validate `?query=` parameters with the same rigour as a body. */
export function readQuery<S extends ZodTypeAny>(req: Request, schema: S): ZodOutput<S> {
  const url = new URL(req.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    if (v !== "") raw[k] = v;
  });
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw ApiError.badRequest(
      issue ? `${issue.path.join(".") || "query"}: ${issue.message}` : "Invalid query.",
    );
  }
  return result.data;
}

/** Route params arrive as strings; ids must be positive integers. */
export function readId(value: string | undefined, what = "id"): number {
  if (!value || !/^\d{1,9}$/.test(value)) throw ApiError.badRequest(`Invalid ${what}.`);
  const n = Number(value);
  if (n < 1) throw ApiError.badRequest(`Invalid ${what}.`);
  return n;
}

export function ok<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status });
}

export function created<T>(payload: T) {
  return NextResponse.json(payload, { status: 201 });
}

/** List envelope the frontend expects: `{ data, page, per_page, total }`. */
export function list<T>(data: T[], meta?: { page: number; per_page: number; total: number }) {
  return NextResponse.json({ data, ...(meta ?? {}) });
}

export type Pagination = { page: number; perPage: number; offset: number };

export function pagination(page?: number, perPage?: number): Pagination {
  const p = Math.max(1, Math.floor(page ?? 1));
  const pp = Math.min(100, Math.max(1, Math.floor(perPage ?? 24)));
  return { page: p, perPage: pp, offset: (p - 1) * pp };
}
