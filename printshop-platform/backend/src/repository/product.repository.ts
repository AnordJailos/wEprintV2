/** Catalogue reads and writes. */
import { count, one, query } from "@/db/pool";
import type { ProductOptionRow, ProductRow } from "@/entities/types";

export const ProductRepository = {
  /**
   * Filtering is done in SQL, not in Node, so a large catalogue stays cheap.
   * `search` is matched with ILIKE against name and description; the term is a
   * bound parameter, never concatenated.
   */
  async list(params: {
    category?: string;
    search?: string;
    includeInactive?: boolean;
    limit: number;
    offset: number;
  }) {
    const where: string[] = [];
    const values: unknown[] = [];

    if (!params.includeInactive) where.push("is_available = TRUE");
    if (params.category && params.category !== "all") {
      values.push(params.category);
      where.push(`category = $${values.length}`);
    }
    if (params.search) {
      values.push(`%${params.search}%`);
      where.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const total = await count(`SELECT COUNT(*)::text AS count FROM products ${clause}`, values);
    const rows = await query<ProductRow>(
      `SELECT * FROM products ${clause} ORDER BY id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, params.limit, params.offset],
    );
    return { rows, total };
  },

  find(id: number) {
    return one<ProductRow>("SELECT * FROM products WHERE id = $1", [id]);
  },

  findBySlug(slug: string) {
    return one<ProductRow>("SELECT * FROM products WHERE slug = $1", [slug]);
  },

  options(productId: number) {
    return query<ProductOptionRow>(
      "SELECT * FROM product_options WHERE product_id = $1 ORDER BY sort_order ASC, id ASC",
      [productId],
    );
  },

  /** All options for a set of products, so a list response needs one query. */
  optionsFor(productIds: number[]) {
    if (productIds.length === 0) return Promise.resolve([] as ProductOptionRow[]);
    return query<ProductOptionRow>(
      "SELECT * FROM product_options WHERE product_id = ANY($1::int[]) ORDER BY sort_order ASC, id ASC",
      [productIds],
    );
  },

  async insert(data: {
    name: string;
    slug: string;
    category: string;
    description: string;
    base_price: number;
    lead_time: string;
    image_url: string | null;
    is_available: boolean;
  }) {
    const row = await one<ProductRow>(
      `INSERT INTO products (name, slug, category, description, base_price, lead_time, image_url, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.name,
        data.slug,
        data.category,
        data.description,
        data.base_price,
        data.lead_time,
        data.image_url,
        data.is_available,
      ],
    );
    return row!;
  },

  update(
    id: number,
    data: Partial<{
      name: string;
      slug: string;
      category: string;
      description: string;
      base_price: number;
      lead_time: string;
      image_url: string | null;
      is_available: boolean;
    }>,
  ) {
    return one<ProductRow>(
      `UPDATE products SET
          name        = COALESCE($2, name),
          slug        = COALESCE($3, slug),
          category    = COALESCE($4, category),
          description = COALESCE($5, description),
          base_price  = COALESCE($6, base_price),
          lead_time   = COALESCE($7, lead_time),
          image_url   = COALESCE($8, image_url),
          is_available = COALESCE($9, is_available),
          updated_at  = NOW()
        WHERE id = $1
        RETURNING *`,
      [
        id,
        data.name ?? null,
        data.slug ?? null,
        data.category ?? null,
        data.description ?? null,
        data.base_price ?? null,
        data.lead_time ?? null,
        data.image_url ?? null,
        data.is_available ?? null,
      ],
    );
  },

  /**
   * Soft delete. A product referenced by an order must not vanish — order_items
   * keeps a foreign key with ON DELETE RESTRICT precisely so history survives.
   */
  async archive(id: number) {
    const row = await one<{ id: number }>(
      "UPDATE products SET is_available = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id",
      [id],
    );
    return row !== null;
  },

  async insertOption(data: {
    product_id: number;
    option_type: string;
    option_value: string;
    swatch: string | null;
    price_delta: number;
    sort_order: number;
  }) {
    const row = await one<ProductOptionRow>(
      `INSERT INTO product_options (product_id, option_type, option_value, swatch, price_delta, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.product_id,
        data.option_type,
        data.option_value,
        data.swatch,
        data.price_delta,
        data.sort_order,
      ],
    );
    return row!;
  },

  async deleteOption(productId: number, optionId: number) {
    const row = await one<{ id: number }>(
      "DELETE FROM product_options WHERE id = $1 AND product_id = $2 RETURNING id",
      [optionId, productId],
    );
    return row !== null;
  },
};
