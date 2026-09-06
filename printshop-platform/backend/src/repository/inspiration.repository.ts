/** The inspiration board. Tags are stored as a comma separated string. */
import { one, query } from "@/db/pool";
import type { InspirationRow } from "@/entities/types";

export const InspirationRepository = {
  list(tag?: string) {
    if (tag && tag !== "all") {
      // Wrap both sides in commas so "poster" never matches "poster-art".
      return query<InspirationRow>(
        `SELECT * FROM inspiration_items
          WHERE ',' || REPLACE(LOWER(tags), ' ', '') || ',' LIKE '%,' || LOWER($1) || ',%'
          ORDER BY created_at DESC, id DESC`,
        [tag.trim()],
      );
    }
    return query<InspirationRow>(
      "SELECT * FROM inspiration_items ORDER BY created_at DESC, id DESC",
    );
  },

  async insert(data: {
    title: string;
    source: string;
    external_url: string;
    image_url: string;
    tags: string;
  }) {
    const row = await one<InspirationRow>(
      `INSERT INTO inspiration_items (title, source, external_url, image_url, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.title, data.source, data.external_url, data.image_url, data.tags],
    );
    return row!;
  },

  async delete(id: number) {
    const row = await one<{ id: number }>(
      "DELETE FROM inspiration_items WHERE id = $1 RETURNING id",
      [id],
    );
    return row !== null;
  },
};
