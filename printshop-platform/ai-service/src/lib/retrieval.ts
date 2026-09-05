/**
 * Retrieval — the R in RAG.
 *
 * Cosine distance through pgvector's `<=>` operator, filtered at 0.7. Anything
 * looser than that is noise, and answering from noise is worse than admitting
 * the knowledge base has no answer.
 */
import { config } from './config';
import { readOnly } from './db';
import { embedOne } from './embedder';

export type Passage = {
  entryId: number;
  title: string;
  category: string | null;
  chunkText: string;
  distance: number;
};

type Row = {
  knowledge_base_entry_id: number;
  title: string;
  category: string | null;
  chunk_text: string;
  distance: string | number;
};

export async function retrieve(question: string): Promise<Passage[]> {
  const { topK, maxDistance } = config();
  const vector = `[${(await embedOne(question)).join(',')}]`;

  const rows = await readOnly<Row>(
    `SELECT v.knowledge_base_entry_id,
            e.title,
            e.category,
            v.chunk_text,
            (v.embedding <=> $1::vector) AS distance
       FROM knowledge_base_embeddings v
       JOIN knowledge_base_entries e ON e.id = v.knowledge_base_entry_id
      WHERE e.is_published = TRUE
        AND (v.embedding <=> $1::vector) <= $2
      ORDER BY distance ASC
      LIMIT $3`,
    [vector, maxDistance, topK],
  );

  return rows.map((r) => ({
    entryId: r.knowledge_base_entry_id,
    title: r.title,
    category: r.category,
    chunkText: r.chunk_text,
    distance: Number(r.distance),
  }));
}
