/**
 * Embeddings, computed in-process.
 *
 * all-MiniLM-L6-v2 through transformers.js: 384 dimensions, mean-pooled and
 * L2-normalised — exactly what the Python sentence-transformers pipeline
 * produced, so existing vectors in the database stay valid. The model is loaded
 * once per process and reused; the first call downloads it into
 * TRANSFORMERS_CACHE.
 */
import { config } from './config.ts';

export const EMBEDDING_DIMENSIONS = 384;

type Extractor = (text: string | string[], opts: { pooling: 'mean'; normalize: boolean }) => Promise<{
  tolist(): number[][];
}>;

const globalForModel = globalThis as unknown as { __akExtractor?: Promise<Extractor> };

async function extractor(): Promise<Extractor> {
  globalForModel.__akExtractor ??= (async () => {
    const { pipeline, env } = await import('@xenova/transformers');
    // No remote calls once the model is cached; keep it local and predictable.
    env.cacheDir = process.env.TRANSFORMERS_CACHE ?? './.model-cache';
    return (await pipeline('feature-extraction', config().embeddingModel)) as unknown as Extractor;
  })();
  return globalForModel.__akExtractor;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const run = await extractor();
  const output = await run(texts, { pooling: 'mean', normalize: true });
  const vectors = output.tolist();

  for (const v of vectors) {
    if (v.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Embedding model returned ${v.length} dimensions; the schema expects ${EMBEDDING_DIMENSIONS}.`);
    }
  }
  return vectors;
}

export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embed([text]);
  return vector!;
}

/** Load the model without answering anything — used by /health and warmup. */
export async function isModelReady(): Promise<boolean> {
  try {
    await embedOne('warmup');
    return true;
  } catch (e) {
    console.error('[embedder]', e);
    return false;
  }
}
