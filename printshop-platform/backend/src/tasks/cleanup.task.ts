/**
 * Housekeeping.
 *
 * Two jobs, both conservative: expire password-reset tokens that nobody used,
 * and delete upload files whose `designs` row is gone. Files are only removed
 * when the database says they are orphans, never the other way round.
 */
import { readdir, stat, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

import { config } from "@/core/config";
import { query } from "@/db/pool";

const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000; // a fresh upload mid-request is not an orphan

export async function expireResetTokens(): Promise<number> {
  const rows = await query<{ id: number }>(
    `UPDATE users
        SET reset_token = NULL, reset_token_expires_at = NULL
      WHERE reset_token IS NOT NULL
        AND (reset_token_expires_at IS NULL OR reset_token_expires_at < NOW())
      RETURNING id`,
  );
  return rows.length;
}

export async function removeOrphanUploads(): Promise<number> {
  const dir = resolve(config().uploadDir);
  const known = new Set(
    (await query<{ file_path: string }>("SELECT file_path FROM designs")).map((r) =>
      r.file_path.split("/").pop()!,
    ),
  );

  let removed = 0;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return 0; // no upload directory yet
  }

  for (const name of entries) {
    if (name.startsWith(".") || known.has(name)) continue;
    const full = join(dir, name);
    const info = await stat(full).catch(() => null);
    if (!info?.isFile()) continue;
    if (Date.now() - info.mtimeMs < ORPHAN_GRACE_MS) continue;
    await unlink(full).catch((e) => console.error("[tasks/cleanup]", name, e));
    removed += 1;
  }
  return removed;
}

export async function runCleanup() {
  const tokens = await expireResetTokens();
  const files = await removeOrphanUploads();
  return { expiredTokens: tokens, removedFiles: files };
}
