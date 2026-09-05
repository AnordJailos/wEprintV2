/**
 * Scheduled maintenance entry point.
 *
 *   npm run tasks            # cleanup + catch-up reindex
 *   npm run tasks cleanup    # just cleanup
 *   npm run tasks reindex    # just reindex
 *
 * Wire it to cron; it exits non-zero if anything failed so cron mail is useful.
 */
import { runCleanup } from '../src/tasks/cleanup.task.ts';
import { reindexStaleEntries } from '../src/tasks/reindex.task.ts';
import { closePool } from '../src/db/pool.ts';

const which = process.argv[2] ?? 'all';

async function main() {
  if (which === 'all' || which === 'cleanup') {
    console.log('[tasks] cleanup', await runCleanup());
  }
  if (which === 'all' || which === 'reindex') {
    console.log('[tasks] reindex', await reindexStaleEntries());
  }
}

main()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error('[tasks] failed', e);
    await closePool().catch(() => undefined);
    process.exit(1);
  });
