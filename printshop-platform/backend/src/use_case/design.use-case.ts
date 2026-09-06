/**
 * Artwork uploads.
 *
 * Security rules that live here:
 *   • The extension is derived from an allow-list of MIME types, never from the
 *     name the browser sent. A file called `art.pdf.php` cannot become a .php.
 *   • The stored filename is random, so nothing user-controlled reaches the
 *     filesystem path.
 *   • Size is checked against the configured maximum before the write.
 */
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertOwnership, type AuthUser } from "@/core/auth";
import { config } from "@/core/config";
import { ApiError } from "@/core/errors";
import { designResponse } from "@/api/dto";
import { DesignRepository } from "@/repository/design.repository";
import { OrderRepository } from "@/repository/order.repository";

/** MIME type → extension. Anything not listed is refused. */
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "application/postscript": "ai",
  "application/illustrator": "ai",
  "image/vnd.adobe.photoshop": "psd",
};

export const DesignUseCase = {
  async list(user: AuthUser, orderId?: number) {
    const rows = await DesignRepository.list({
      userId: user.role === "admin" ? null : user.id,
      orderId,
    });
    return rows.map(designResponse);
  },

  async get(user: AuthUser, id: number) {
    const design = await DesignRepository.find(id);
    if (!design) throw ApiError.notFound("No such design.");
    assertOwnership(user, design.user_id);
    return designResponse(design);
  },

  async upload(user: AuthUser, input: { file: File; orderId?: number; notes?: string }) {
    const cfg = config();
    const mime = input.file.type || "application/octet-stream";
    const ext = ALLOWED[mime];
    if (!ext) {
      throw ApiError.badRequest("Send a PNG, JPG, WEBP, SVG, PDF, AI or PSD file.");
    }
    if (input.file.size <= 0) throw ApiError.badRequest("That file is empty.");
    if (input.file.size > cfg.maxUploadBytes) {
      throw ApiError.tooLarge(
        `Keep artwork under ${Math.floor(cfg.maxUploadBytes / 1024 / 1024)} MB.`,
      );
    }

    if (input.orderId !== undefined) {
      const order = await OrderRepository.find(input.orderId);
      if (!order) throw ApiError.badRequest("That order does not exist.");
      assertOwnership(user, order.user_id);
    }

    // Random name, allow-listed extension: the path can never be influenced.
    const storedName = `${randomUUID()}.${ext}`;
    const dir = path.resolve(cfg.uploadDir);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, storedName), Buffer.from(await input.file.arrayBuffer()));

    const original = (input.file.name || `artwork.${ext}`).replace(/[^\w.\- ]/g, "").slice(0, 160);

    const row = await DesignRepository.insert({
      user_id: user.id,
      order_id: input.orderId ?? null,
      file_name: original,
      file_path: storedName,
      mime_type: mime,
      size_bytes: input.file.size,
      notes: input.notes ?? null,
    });
    return designResponse(row);
  },

  /**
   * The row goes first, then the file. If the unlink fails (already gone, or a
   * permission problem) the request still succeeds — a stray file is harmless
   * and `tasks/cleanup` sweeps orphans. The reverse order would risk a row
   * pointing at nothing.
   */
  async remove(user: AuthUser, id: number) {
    const design = await DesignRepository.find(id);
    if (!design) throw ApiError.notFound("No such design.");
    assertOwnership(user, design.user_id);

    await DesignRepository.delete(id);
    try {
      await unlink(path.join(path.resolve(config().uploadDir), design.file_path));
    } catch {
      /* file already absent */
    }
  },
};
