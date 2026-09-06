/** Catalogue rules: slugs, availability, option pricing. */
import { z } from "zod";

import { ApiError } from "@/core/errors";
import {
  productOptionResponse,
  productResponse,
  type createProductOptionSchema,
  type createProductSchema,
  type updateProductSchema,
} from "@/api/dto";
import { ProductRepository } from "@/repository/product.repository";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

export const ProductUseCase = {
  /**
   * `includeInactive` is true only for the admin. A customer must not be able to
   * discover an archived product by paging the public list.
   */
  async list(params: {
    category?: string;
    search?: string;
    page: number;
    perPage: number;
    offset: number;
    includeInactive: boolean;
  }) {
    const { rows, total } = await ProductRepository.list({
      category: params.category,
      search: params.search,
      includeInactive: params.includeInactive,
      limit: params.perPage,
      offset: params.offset,
    });
    const options = await ProductRepository.optionsFor(rows.map((r) => r.id));
    const data = rows.map((p) =>
      productResponse(
        p,
        options.filter((o) => o.product_id === p.id),
      ),
    );
    return { data, page: params.page, per_page: params.perPage, total };
  },

  /** Accepts a numeric id or a slug, because the UI links by both. */
  async get(idOrSlug: string, includeInactive: boolean) {
    const product = /^\d+$/.test(idOrSlug)
      ? await ProductRepository.find(Number(idOrSlug))
      : await ProductRepository.findBySlug(idOrSlug);

    if (!product || (!product.is_available && !includeInactive)) {
      throw ApiError.notFound("No such product.");
    }
    return productResponse(product, await ProductRepository.options(product.id));
  },

  async create(input: z.infer<typeof createProductSchema>) {
    const slug = input.slug ?? slugify(input.name);
    if (await ProductRepository.findBySlug(slug)) {
      throw ApiError.conflict("A product with that slug already exists.");
    }
    const product = await ProductRepository.insert({
      name: input.name,
      slug,
      category: input.category,
      description: input.description ?? "",
      base_price: input.base_price,
      lead_time: input.lead_time ?? "3-5 working days",
      image_url: input.image_url ?? input.image ?? null,
      is_available: input.is_available ?? true,
    });
    return productResponse(product, []);
  },

  async update(id: number, input: z.infer<typeof updateProductSchema>) {
    const existing = await ProductRepository.find(id);
    if (!existing) throw ApiError.notFound("No such product.");

    if (input.slug && input.slug !== existing.slug) {
      const clash = await ProductRepository.findBySlug(input.slug);
      if (clash) throw ApiError.conflict("A product with that slug already exists.");
    }

    const updated = await ProductRepository.update(id, {
      name: input.name,
      slug: input.slug,
      category: input.category,
      description: input.description,
      base_price: input.base_price,
      lead_time: input.lead_time,
      image_url: input.image_url ?? input.image,
      is_available: input.is_available,
    });
    if (!updated) throw ApiError.notFound("No such product.");
    return productResponse(updated, await ProductRepository.options(id));
  },

  /**
   * Archive rather than delete: `order_items` references products so past
   * receipts keep making sense. The product simply stops appearing publicly.
   */
  async archive(id: number) {
    const existing = await ProductRepository.find(id);
    if (!existing) throw ApiError.notFound("No such product.");
    await ProductRepository.archive(id);
  },

  async addOption(productId: number, input: z.infer<typeof createProductOptionSchema>) {
    const product = await ProductRepository.find(productId);
    if (!product) throw ApiError.notFound("No such product.");
    const option = await ProductRepository.insertOption({
      product_id: productId,
      option_type: input.option_type,
      option_value: input.option_value,
      swatch: input.swatch ?? null,
      price_delta: input.price_delta ?? 0,
      sort_order: input.sort_order ?? 0,
    });
    return productOptionResponse(option);
  },

  async removeOption(productId: number, optionId: number) {
    const removed = await ProductRepository.deleteOption(productId, optionId);
    if (!removed) throw ApiError.notFound("No such product option.");
  },
};
