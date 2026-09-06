/**
 * One error shape, structurally enforced.
 *
 * Handlers never build a JSON error body by hand; they throw `ApiError` (or let
 * one bubble up) and `withErrors()` renders it. That is why every failure the
 * frontend sees looks like:
 *
 *   { "error": { "code": "NOT_FOUND", "message": "No such order." } }
 *
 * The frontend's ApiError class reads exactly those two fields.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
};

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get status(): number {
    return STATUS[this.code];
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError("BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Sign in to continue.") {
    return new ApiError("UNAUTHORIZED", message);
  }
  static forbidden(message = "This area belongs to the studio owner.") {
    return new ApiError("FORBIDDEN", message);
  }
  static notFound(message: string) {
    return new ApiError("NOT_FOUND", message);
  }
  static conflict(message: string) {
    return new ApiError("CONFLICT", message);
  }
  static tooLarge(message: string) {
    return new ApiError("PAYLOAD_TOO_LARGE", message);
  }
  static rateLimited(message = "Too many attempts. Try again shortly.") {
    return new ApiError("RATE_LIMITED", message);
  }
  static upstream(message: string) {
    return new ApiError("UPSTREAM_ERROR", message);
  }
}

function body(code: ErrorCode, message: string, details?: unknown) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

/**
 * Wrap every route handler. Known failures render as themselves; anything else
 * renders as a generic 500 and is logged server-side — the client never sees a
 * stack trace, a SQL string or a constraint name.
 */
export function withErrors<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse> | NextResponse,
) {
  return async (...args: A): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json(body(e.code, e.message, e.details), { status: e.status });
      }
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return NextResponse.json(
          body(
            "BAD_REQUEST",
            first ? `${first.path.join(".") || "body"}: ${first.message}` : "Invalid request.",
          ),
          { status: 400 },
        );
      }
      // Postgres surfaces uniqueness as 23505; treat it as a conflict, not a 500.
      const pg = e as { code?: string; constraint?: string };
      if (pg?.code === "23505") {
        return NextResponse.json(body("CONFLICT", "That value is already taken."), { status: 409 });
      }
      console.error("[unhandled]", e);
      return NextResponse.json(body("INTERNAL", "Something went wrong on our side."), {
        status: 500,
      });
    }
  };
}

/** 204 with no body — used by the DELETE endpoints. */
export function noContent() {
  return new NextResponse(null, { status: 204 });
}
