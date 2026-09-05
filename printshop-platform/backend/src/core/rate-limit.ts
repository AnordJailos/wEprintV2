/**
 * A small fixed-window limiter for the endpoints an attacker would hammer:
 * login, register, forgot-password, reset-password and the AI chat.
 *
 * In-process on purpose. It protects a single-node deployment (which is what the
 * studio runs) with zero infrastructure. If you scale to several instances, swap
 * the Map for Redis — the call sites do not change.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Keep the map from growing without bound on a long-lived process.
function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

export type Limit = { limit: number; windowMs: number };

export const LIMITS = {
  auth: { limit: 10, windowMs: 60_000 }, // 10 sign-in attempts a minute
  reset: { limit: 5, windowMs: 15 * 60_000 },
  chat: { limit: 30, windowMs: 60_000 },
  upload: { limit: 20, windowMs: 60_000 },
  write: { limit: 60, windowMs: 60_000 },
} satisfies Record<string, Limit>;

/** True when the caller is still inside its allowance. */
export function allow(key: string, { limit, windowMs }: Limit): boolean {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  existing.count += 1;
  return existing.count <= limit;
}

/**
 * Best-effort client identity. Behind a proxy set `x-forwarded-for`; the first
 * hop is used. Never trusted for authorisation — only for throttling.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
