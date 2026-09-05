/**
 * Access level as a function call, not a scattered `if`.
 *
 * The Rust version used Actix extractors (`AuthUser` / `AdminUser`). Next.js has
 * no extractor mechanism, so the equivalent guarantee is: every protected route
 * begins with `const user = await requireUser(req)` or `requireAdmin(req)`, and
 * these throw before the handler body can touch data.
 *
 * Both re-read the user row on every request. A token whose account was deleted,
 * demoted or had its role changed stops working immediately.
 */
import type { NextRequest } from 'next/server';

import { ApiError } from './errors';
import { verifyToken } from './jwt';
import { UserRepository } from '@/repository/user.repository';
import type { UserRow } from '@/entities/types';

export type AuthUser = Pick<UserRow, 'id' | 'name' | 'email' | 'role' | 'phone'>;

function bearer(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

/** Any signed-in customer or the admin. */
export async function requireUser(req: NextRequest): Promise<AuthUser> {
  const token = bearer(req);
  if (!token) throw ApiError.unauthorized('Missing bearer token.');

  const claims = await verifyToken(token);
  if (!claims) throw ApiError.unauthorized('Invalid or expired token.');

  const user = await UserRepository.findById(Number(claims.sub));
  if (!user) throw ApiError.unauthorized('Account no longer exists.');

  // The row is the source of truth for role; the claim is only a hint.
  return { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone };
}

/** The single studio owner. Decision D-7: there is exactly one admin. */
export async function requireAdmin(req: NextRequest): Promise<AuthUser> {
  const user = await requireUser(req);
  if (user.role !== 'admin') throw ApiError.forbidden();
  return user;
}

/** Optional identity: used by endpoints that behave differently when signed in. */
export async function optionalUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    return await requireUser(req);
  } catch {
    return null;
  }
}

/** Customers may only ever reach their own rows; the admin may reach any. */
export function assertOwnership(user: AuthUser, ownerId: number) {
  if (user.role === 'admin') return;
  if (user.id !== ownerId) throw ApiError.notFound('Not found.'); // don't confirm existence
}
