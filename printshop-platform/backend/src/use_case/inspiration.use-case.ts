/** The inspiration board: read by anyone, curated by the owner. */
import { z } from "zod";

import { ApiError } from "@/core/errors";
import { createInspirationSchema, inspirationResponse } from "@/api/dto";
import { InspirationRepository } from "@/repository/inspiration.repository";

/**
 * Only http(s) links are accepted. `javascript:` and `data:` URLs are the way a
 * curated board turns into a stored-XSS vector, so they are rejected before the
 * row exists rather than escaped at render time.
 */
function assertSafeUrl(url: string, field: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw ApiError.badRequest(`${field} must be a full URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw ApiError.badRequest(`${field} must start with http:// or https://`);
  }
}

export const InspirationUseCase = {
  async list(tag?: string) {
    return (await InspirationRepository.list(tag)).map(inspirationResponse);
  },

  async create(input: z.infer<typeof createInspirationSchema>) {
    const image = input.image_url ?? input.image;
    if (!image) throw ApiError.badRequest("An image URL is required.");

    assertSafeUrl(input.external_url, "external_url");
    assertSafeUrl(image, "image_url");

    const tags = [...new Set(input.tags.map((t) => t.toLowerCase().replace(/\s+/g, "-")))].join(
      ",",
    );
    const row = await InspirationRepository.insert({
      title: input.title,
      source: input.source,
      external_url: input.external_url,
      image_url: image,
      tags,
    });
    return inspirationResponse(row);
  },

  async remove(id: number) {
    const removed = await InspirationRepository.delete(id);
    if (!removed) throw ApiError.notFound("No such inspiration item.");
  },
};
