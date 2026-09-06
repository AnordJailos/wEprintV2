/**
 * Turn one knowledge base entry into chunks + vectors and hand them back.
 *
 * Decision D-5: this service computes embeddings and returns them. The backend
 * writes them, because this process only holds a read-only credential (D-4).
 * The response shape is the contract in backend/src/ai/client.ts.
 */
import { z } from "zod";

import { chunkText } from "@/lib/chunk";
import { embed } from "@/lib/embedder";
import { requireInternalKey, toResponse } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  knowledge_base_entry_id: z.number().int().positive(),
  title: z.string().trim().min(1).max(300),
  content: z.string().trim().min(1).max(200_000),
});

export async function POST(req: Request) {
  try {
    requireInternalKey(req);

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "knowledge_base_entry_id, title and content are required.",
          },
        },
        { status: 400 },
      );
    }

    const { title, content } = parsed.data;
    // Each chunk carries its title: a passage read alone still says what it is about.
    const texts = chunkText(content).map((c) => `${title}\n${c}`);
    const vectors = await embed(texts);

    return Response.json({
      chunks: texts.map((chunk_text, i) => ({
        chunk_index: i,
        chunk_text,
        embedding: vectors[i]!,
      })),
    });
  } catch (e) {
    return toResponse(e);
  }
}
