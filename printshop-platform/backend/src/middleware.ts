/**
 * The one place that speaks to every request before a handler does.
 *
 * Responsibilities, and deliberately nothing else:
 *   1. CORS — an explicit allow-list echoed back per request. Never `*`, because
 *      the API is called with an Authorization header.
 *   2. Preflight — answered here so no handler needs an OPTIONS export.
 *   3. Security headers — applied to every response including error responses.
 *
 * Authentication is NOT done here. It is done by `requireUser` / `requireAdmin`
 * inside each handler, so a route cannot accidentally become public by falling
 * outside a matcher pattern.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_HEADERS = 'authorization, content-type, x-requested-with';
const ALLOWED_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';

function allowedOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  const list = allowedOrigins();
  const normalised = origin.replace(/\/$/, '');
  if (!list.includes(normalised)) return {};
  return {
    'access-control-allow-origin': normalised,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': ALLOWED_METHODS,
    'access-control-allow-headers': ALLOWED_HEADERS,
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-resource-policy': 'same-site',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
};

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: { ...cors, ...SECURITY_HEADERS } });
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries({ ...cors, ...SECURITY_HEADERS })) res.headers.set(k, v);
  return res;
}

export const config = {
  // Everything except Next's own static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
