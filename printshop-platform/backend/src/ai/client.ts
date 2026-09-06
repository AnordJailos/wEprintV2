/**
 * The backend's HTTP client for the AI service.
 *
 * Decision D-2/D-6: the browser never talks to the AI service. Only this file
 * does, over a private address, with a shared secret in `x-internal-key`.
 * Decision D-5: `/reindex` returns plain float arrays; the INSERT happens in
 * `KnowledgeRepository.replaceEmbeddings`, never here.
 */
import { config } from "@/core/config";
import { ApiError } from "@/core/errors";

export type GenerateRequest = { question: string; conversation_id?: string };
export type GenerateResponse = { answer: string; sources: string[] };

export type ReindexRequest = { knowledge_base_entry_id: number; title: string; content: string };
export type ReindexResponse = {
  chunks: { chunk_index: number; chunk_text: string; embedding: number[] }[];
};

const TIMEOUT_MS = 30_000;

async function post<T>(path: string, body: unknown): Promise<T> {
  const cfg = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${cfg.aiServiceUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-key": cfg.internalApiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      // Never surface the upstream body: it may contain prompts or SQL.
      console.error("[ai-service]", path, res.status, (await res.text()).slice(0, 500));
      throw ApiError.upstream("The assistant is unavailable right now.");
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    console.error("[ai-service]", path, e);
    throw ApiError.upstream("The assistant is unavailable right now.");
  } finally {
    clearTimeout(timer);
  }
}

export const AiClient = {
  generate(req: GenerateRequest) {
    return post<GenerateResponse>("/internal/ai/generate", req);
  },
  reindex(req: ReindexRequest) {
    return post<ReindexResponse>("/internal/ai/reindex", req);
  },
  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${config().aiServiceUrl.replace(/\/$/, "")}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
