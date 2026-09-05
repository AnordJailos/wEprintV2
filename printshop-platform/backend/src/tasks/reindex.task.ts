/**
 * Catch-up reindexing.
 *
 * Knowledge entries are indexed the moment they are saved. If the AI service
 * was restarting at that moment, the entry is still in the database with no
 * vectors — this task finds those and fixes them. Safe to run on a schedule.
 */
import { KnowledgeRepository } from '@/repository/knowledge.repository';
import { AiUseCase } from '@/use_case/ai.use-case';

export async function reindexStaleEntries(): Promise<{ scanned: number; reindexed: number; failed: number }> {
  const stale = await KnowledgeRepository.staleEntryIds();
  let reindexed = 0;
  let failed = 0;

  for (const { id } of stale) {
    try {
      await AiUseCase.reindex(id);
      reindexed += 1;
    } catch (e) {
      failed += 1;
      console.error('[tasks/reindex] entry', id, e);
    }
  }
  return { scanned: stale.length, reindexed, failed };
}
