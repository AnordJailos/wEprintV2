/**
 * Download and load the embedding model before the first customer question, so
 * nobody pays the cold-start cost. Run once after deploying: `npm run warmup`.
 */
import { isModelReady } from '../src/lib/embedder.ts';

const ok = await isModelReady();
console.log(ok ? 'Embedding model ready.' : 'Embedding model failed to load — see the error above.');
process.exit(ok ? 0 : 1);
