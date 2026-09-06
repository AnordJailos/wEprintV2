/**
 * The assistant and the knowledge base behind it.
 *
 * Decision D-5 is visible in `reindex`: the AI service computes vectors, this
 * file writes them with the backend's credential.
 */
import { z } from "zod";

import { AiClient } from "@/ai/client";
import { ApiError } from "@/core/errors";
import {
  knowledgeResponse,
  type createKnowledgeSchema,
  type updateKnowledgeSchema,
} from "@/api/dto";
import { KnowledgeRepository } from "@/repository/knowledge.repository";

export const AiUseCase = {
  async chat(question: string, conversationId?: string) {
    const res = await AiClient.generate({ question, conversation_id: conversationId });
    return { answer: res.answer, sources: res.sources ?? [] };
  },

  async listEntries() {
    return (await KnowledgeRepository.list()).map(knowledgeResponse);
  },

  /**
   * A new entry is indexed immediately when possible. If the AI service happens
   * to be down, the entry is still saved and `tasks/reindex` picks it up later —
   * the owner's work is never lost because a sidecar was restarting.
   */
  async createEntry(input: z.infer<typeof createKnowledgeSchema>) {
    const row = await KnowledgeRepository.insert({
      title: input.title,
      content: input.content,
      category: input.category ?? null,
      is_published: input.is_published ?? true,
    });
    void AiUseCase.reindex(row.id).catch(() => undefined);
    return knowledgeResponse(row);
  },

  async updateEntry(id: number, input: z.infer<typeof updateKnowledgeSchema>) {
    const existing = await KnowledgeRepository.find(id);
    if (!existing) throw ApiError.notFound("No such knowledge entry.");

    const updated = await KnowledgeRepository.update(id, {
      title: input.title,
      content: input.content,
      category: input.category,
      is_published: input.is_published,
    });
    if (input.title || input.content) void AiUseCase.reindex(id).catch(() => undefined);
    return knowledgeResponse(updated!);
  },

  async deleteEntry(id: number) {
    const removed = await KnowledgeRepository.delete(id);
    if (!removed) throw ApiError.notFound("No such knowledge entry.");
  },

  /** Ask for vectors, then write them here, atomically. */
  async reindex(id: number) {
    const entry = await KnowledgeRepository.find(id);
    if (!entry) throw ApiError.notFound("No such knowledge entry.");

    const res = await AiClient.reindex({
      knowledge_base_entry_id: entry.id,
      title: entry.title,
      content: entry.content,
    });
    const written = await KnowledgeRepository.replaceEmbeddings(entry.id, res.chunks ?? []);
    return { knowledge_base_entry_id: entry.id, chunks_written: written };
  },
};
