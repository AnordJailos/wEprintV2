/** Users and the credentials attached to them. SQL only — no rules here. */
import { one, query } from "@/db/pool";
import type { Role, UserRow } from "@/entities/types";

export const UserRepository = {
  findById(id: number) {
    return one<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  },

  /** Email is compared case-insensitively; it is stored lower-cased. */
  findByEmail(email: string) {
    return one<UserRow>("SELECT * FROM users WHERE email = LOWER($1)", [email]);
  },

  async insert(data: { name: string; email: string; passwordHash: string; role: Role }) {
    const row = await one<UserRow>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, LOWER($2), $3, $4)
       RETURNING *`,
      [data.name, data.email, data.passwordHash, data.role],
    );
    return row!;
  },

  async updateProfile(id: number, data: { name?: string; phone?: string | null }) {
    const row = await one<UserRow>(
      `UPDATE users
          SET name  = COALESCE($2, name),
              phone = COALESCE($3, phone)
        WHERE id = $1
        RETURNING *`,
      [id, data.name ?? null, data.phone ?? null],
    );
    return row;
  },

  setResetToken(id: number, token: string, expiresAt: Date) {
    return query("UPDATE users SET reset_token = $2, reset_token_expires_at = $3 WHERE id = $1", [
      id,
      token,
      expiresAt.toISOString(),
    ]);
  },

  /** Only an unexpired token matches; expiry is decided by the database clock. */
  findByResetToken(token: string) {
    return one<UserRow>(
      `SELECT * FROM users
        WHERE reset_token = $1
          AND reset_token_expires_at IS NOT NULL
          AND reset_token_expires_at > NOW()`,
      [token],
    );
  },

  /** Consuming the token in the same statement makes it single-use. */
  applyNewPassword(id: number, passwordHash: string) {
    return query(
      `UPDATE users
          SET password_hash = $2,
              reset_token = NULL,
              reset_token_expires_at = NULL
        WHERE id = $1`,
      [id, passwordHash],
    );
  },

  clearExpiredResetTokens() {
    return query(
      `UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL
        WHERE reset_token IS NOT NULL AND reset_token_expires_at < NOW()`,
    );
  },

  adminExists() {
    return one<{ id: number }>(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  },
};
