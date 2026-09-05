/** Uploaded artwork. Files live on disk; this table is the index. */
import { one, query } from '@/db/pool';
import type { DesignRow } from '@/entities/types';

export const DesignRepository = {
  list(params: { userId: number | null; orderId?: number }) {
    const where: string[] = [];
    const values: unknown[] = [];
    if (params.userId !== null) {
      values.push(params.userId);
      where.push(`user_id = $${values.length}`);
    }
    if (params.orderId) {
      values.push(params.orderId);
      where.push(`order_id = $${values.length}`);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return query<DesignRow>(`SELECT * FROM designs ${clause} ORDER BY uploaded_at DESC, id DESC`, values);
  },

  find(id: number) {
    return one<DesignRow>('SELECT * FROM designs WHERE id = $1', [id]);
  },

  async insert(data: {
    user_id: number;
    order_id: number | null;
    file_name: string;
    file_path: string;
    mime_type: string;
    size_bytes: number;
    notes: string | null;
  }) {
    const row = await one<DesignRow>(
      `INSERT INTO designs (user_id, order_id, file_name, file_path, mime_type, size_bytes, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.user_id,
        data.order_id,
        data.file_name,
        data.file_path,
        data.mime_type,
        data.size_bytes,
        data.notes,
      ],
    );
    return row!;
  },

  async delete(id: number) {
    const row = await one<{ id: number }>('DELETE FROM designs WHERE id = $1 RETURNING id', [id]);
    return row !== null;
  },
};
