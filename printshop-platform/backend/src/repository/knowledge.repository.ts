/**
 * The assistant's knowledge base and its vectors.
 *
 * Decision D-5 lives here: the embedding INSERT happens in the backend, using
 * the backend's read/write credential. The AI service only ever computes the
 * float arrays and hands them back.
 */
import { one, query, transaction } from '@/db/pool';
import type { KnowledgeEntryRow } from '@/entities/types';

export const KnowledgeRepository = {
  list(publishedOnly = false) {
    return query<KnowledgeEntryRow>(
      `SELECT * FROM knowledge_base_entries ${publishedOnly ? 'WHERE is_published = TRUE' : ''} ORDER BY id ASC`,
    );
  },

  find(id: number) {
    return one<KnowledgeEntryRow>('SELECT * FROM knowledge_base_entries WHERE id = $1', [id]);
  },

  async insert(data: { title: string; content: string; category: string | null; is_published: boolean }) {
    const row = await one<KnowledgeEntryRow>(
      `INSERT INTO knowledge_base_entries (title, content, category, is_published, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [data.title, data.content, data.category, data.is_published],
    );
    return row!;
  },

  update(
    id: number,
    data: Partial<{ title: string; content: string; category: string | null; is_published: boolean }>,
  ) {
    return one<KnowledgeEntryRow>(
      `UPDATE knowledge_base_entries SET
          title        = COALESCE($2, title),
          content      = COALESCE($3, content),
          category     = COALESCE($4, category),
          is_published = COALESCE($5, is_published),
          updated_at   = NOW()
        WHERE id = $1
        RETURNING *`,
      [id, data.title ?? null, data.content ?? null, data.category ?? null, data.is_published ?? null],
    );
  },

  async delete(id: number) {
    const row = await one<{ id: number }>('DELETE FROM knowledge_base_entries WHERE id = $1 RETURNING id', [id]);
    return row !== null;
  },

  /**
   * Replace every vector for one entry atomically, so a reindex can never leave
   * the assistant reading half-old, half-new chunks.
   */
  replaceEmbeddings(entryId: number, chunks: { chunk_index: number; chunk_text: string; embedding: number[] }[]) {
    return transaction(async (client) => {
      await client.query('DELETE FROM knowledge_base_embeddings WHERE knowledge_base_entry_id = $1', [entryId]);
      for (const chunk of chunks) {
        await client.query(
          `INSERT INTO knowledge_base_embeddings (knowledge_base_entry_id, chunk_index, chunk_text, embedding)
           VALUES ($1, $2, $3, $4::vector)`,
          [entryId, chunk.chunk_index, chunk.chunk_text, `[${chunk.embedding.join(',')}]`],
        );
      }
      return chunks.length;
    });
  },

  /** Entries whose text changed after their vectors were written. */
  staleEntryIds() {
    return query<{ id: number }>(
      `SELECT e.id
         FROM knowledge_base_entries e
    LEFT JOIN (
              SELECT knowledge_base_entry_id AS id, MAX(created_at) AS indexed_at
                FROM knowledge_base_embeddings GROUP BY knowledge_base_entry_id
             ) v ON v.id = e.id
        WHERE e.is_published = TRUE
          AND (v.indexed_at IS NULL OR v.indexed_at < e.updated_at)
        ORDER BY e.id ASC`,
    );
  },
};
