/**
 * Validated configuration for the AI service.
 *
 * Two rules are encoded here rather than trusted:
 *  - D-4: the database URL is expected to be the read-only role.
 *  - the shared secret must be long enough to be worth having.
 */
import { z } from 'zod';

const schema = z.object({
  databaseUrl: z.string().min(1, 'AI_DATABASE_URL is required'),
  internalApiKey: z.string().min(16, 'INTERNAL_API_KEY must be at least 16 characters'),
  chunkWords: z.number().int().min(40).max(600),
  chunkOverlapWords: z.number().int().min(0).max(200),
  maxDistance: z.number().min(0).max(2),
  topK: z.number().int().min(1).max(20),
  embeddingModel: z.string().min(1),
  llmApiUrl: z.string(),
  llmApiKey: z.string(),
  llmModel: z.string(),
});

export type AiConfig = z.infer<typeof schema>;

let cached: AiConfig | null = null;

export function config(): AiConfig {
  if (cached) return cached;
  const env = process.env;
  const parsed = schema.safeParse({
    databaseUrl: env.AI_DATABASE_URL ?? '',
    internalApiKey: env.INTERNAL_API_KEY ?? '',
    chunkWords: Number(env.CHUNK_WORDS ?? 150),
    chunkOverlapWords: Number(env.CHUNK_OVERLAP_WORDS ?? 25),
    maxDistance: Number(env.MAX_DISTANCE ?? 0.7),
    topK: Number(env.TOP_K ?? 5),
    embeddingModel: env.EMBEDDING_MODEL ?? 'Xenova/all-MiniLM-L6-v2',
    llmApiUrl: env.LLM_API_URL ?? '',
    llmApiKey: env.LLM_API_KEY ?? env.LOVABLE_API_KEY ?? '',
    llmModel: env.LLM_MODEL ?? 'openai/gpt-5.6-sol',
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid AI service configuration — ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  }
  cached = parsed.data;
  return cached;
}
