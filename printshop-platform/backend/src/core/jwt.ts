/**
 * HS256 access tokens, issued and verified with `jose` (pure JS, no addons).
 *
 * The token carries the minimum needed to authorise a request: subject (user
 * id) and role. Everything else is read from the database, so a stolen token
 * can never assert a name, an email or an elevated role that the row denies.
 */
import { SignJWT, jwtVerify } from 'jose';

import { config } from './config';

export type Claims = {
  sub: string;
  role: 'customer' | 'admin';
  iat: number;
  exp: number;
};

function key(): Uint8Array {
  return new TextEncoder().encode(config().jwtSecret);
}

export async function issueToken(userId: number, role: 'customer' | 'admin'): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setIssuer('ak-print-studio')
    .setAudience('ak-print-studio-app')
    .setExpirationTime(config().jwtExpiresIn)
    .sign(key());
}

export async function verifyToken(token: string): Promise<Claims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ['HS256'],
      issuer: 'ak-print-studio',
      audience: 'ak-print-studio-app',
    });
    const role = payload.role === 'admin' ? 'admin' : 'customer';
    if (!payload.sub || !/^\d+$/.test(payload.sub)) return null;
    return { sub: payload.sub, role, iat: payload.iat ?? 0, exp: payload.exp ?? 0 };
  } catch {
    return null;
  }
}
