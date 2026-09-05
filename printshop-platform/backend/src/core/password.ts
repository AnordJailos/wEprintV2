/**
 * Password hashing with Node's built-in scrypt.
 *
 * Why scrypt and not bcrypt/argon2: both of those are native addons that need a
 * compiler on the host and break on some managed Node platforms. `crypto.scrypt`
 * ships with Node, is memory-hard, and needs no build step — the important
 * properties (per-password random salt, tuned cost, constant-time compare) are
 * all preserved here.
 *
 * Stored format:  scrypt$N$r$p$<saltB64>$<hashB64>
 * Upgrading cost later is safe: old hashes carry their own parameters.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const N = 16384; // CPU/memory cost
const R = 8;
const P = 1;
const KEYLEN = 32;
const MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(plain.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  try {
    const salt = Buffer.from(saltB64!, 'base64');
    const expected = Buffer.from(hashB64!, 'base64');
    const actual = await scrypt(plain.normalize('NFKC'), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Opaque, URL-safe token used for password resets. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
