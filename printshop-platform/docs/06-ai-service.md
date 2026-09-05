# 06 — AI Service Guide

A Next.js process implementing retrieval-augmented generation over the studio's
own notes. It answers from what you wrote, and admits ignorance otherwise.

Everything runs in-process: embeddings come from `@xenova/transformers`, so there
is no Python runtime and no external embedding API.

---

## Why RAG rather than a plain chatbot

A general language model will happily invent your turnaround times. RAG makes
that structurally hard: the model is only shown passages retrieved from your
knowledge base, and is instructed to answer from them alone. If retrieval finds
nothing relevant, the answer is "I don't have that in the studio's notes yet."

Ask a wrong answer's question a second way and you will usually find the note is
vague, not the model. Fix the note.

---

## The four steps

```text
Reindex (when you save a note)
  content ──▶ chunk.ts ──▶ embedder.ts ──▶ back to the backend ──▶ Postgres

Answer (when a customer asks)
  question ──▶ embedder.ts ──▶ retrieval.ts ──▶ generate.ts ──▶ answer
```

### 1. Chunking — `src/lib/chunk.ts`

Splits an entry into 150-word windows with 25 words of overlap, each prefixed
with the entry's title. Paragraph breaks are respected first, so a chunk rarely
mixes two topics.

Whole documents retrieve badly: a long page is weakly similar to everything.
Small chunks are precise. The overlap exists so a fact split across a boundary
still appears intact in one chunk.

| Setting | Default | Raise it to… | Lower it to… |
| --- | --- | --- | --- |
| `CHUNK_WORDS` | 150 | keep more context per hit | make retrieval more precise |
| `CHUNK_OVERLAP_WORDS` | 25 | stop losing boundary-straddling facts | save storage |

Changing either requires a reindex to take effect on existing entries.

### 2. Embedding — `src/lib/embedder.ts`

`Xenova/all-MiniLM-L6-v2` turns text into 384 mean-pooled, L2-normalised
numbers — numerically the same pipeline the Python `sentence-transformers`
version produced, so vectors already in the database stay valid.

The model is loaded once per process and cached in `TRANSFORMERS_CACHE`. Run
`npm run warmup` after deploying so the first customer question is not the slow
one.

The same model must embed both the notes and the questions. Mixing models
produces nonsense distances, not an error.

### 3. Retrieval — `src/lib/retrieval.ts`

Asks pgvector for the nearest chunks by cosine distance (`<=>`), joins to
`knowledge_base_entries`, keeps only published entries, then throws away
anything above `MAX_DISTANCE`.

| Distance | Meaning |
| --- | --- |
| 0.0–0.3 | Nearly the same subject |
| 0.3–0.7 | Related — the default keep zone |
| 0.7–1.0 | Loosely connected; usually noise |
| > 1.0 | Unrelated |

`MAX_DISTANCE = 0.7` is the honesty dial. Lower it (0.5) and the assistant says
"I don't know" more often but is rarely wrong. Raise it (0.9) and it always has
something to say, some of it irrelevant. Start low.

`TOP_K = 5` caps how many passages are considered.

### 4. Generation — `src/lib/generate.ts`

Two modes:

- **Extractive** (no `LLM_API_URL`): the best passages are returned close to
  verbatim. Blunter prose, zero cost, zero hallucination risk. Perfectly usable.
- **LLM** (`LLM_API_URL` set): the passages go into a strict system prompt that
  forbids outside knowledge, caps the length, and tells the model to treat the
  passages as data — so a note containing "ignore your instructions" is ignored.
  Any OpenAI-compatible endpoint works: set `LLM_API_URL`, `LLM_API_KEY`,
  `LLM_MODEL`.

If the LLM call fails or times out it falls back to extractive rather than
erroring. The customer always gets an answer.

---

## Routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /health` | none | Database reachable + model loadable |
| `POST /internal/ai/generate` | `x-internal-key` | `{question}` → `{answer, sources}` |
| `POST /internal/ai/reindex` | `x-internal-key` | `{knowledge_base_entry_id,title,content}` → `{chunks:[{chunk_index,chunk_text,embedding}]}` |

The key is compared with `timingSafeEqual` in `src/lib/guard.ts`, so it cannot be
guessed one byte at a time.

---

## Teaching the assistant

1. Sign in as admin and write a knowledge base entry: a clear title and a body
   that reads like you explaining it out loud.
2. Save it. The backend's reindex task notices, asks this service for vectors,
   and stores them (`npm run tasks` in the backend, or on a cron).
3. Ask the assistant the question a customer would ask, in their words.

Good entries are specific and self-contained:

> **Rush orders** — Rush turnaround is available on posters and stickers for a
> 40 percent surcharge, subject to press availability. Ask on your order thread
> before paying; we confirm in writing first. Rush is not available on
> embroidery.

Bad entries are vague and depend on context you did not include:

> **Rush** — Sometimes possible, ask us.

Confirm what got indexed:

```sql
SELECT k.title, COUNT(e.id) AS chunks
  FROM knowledge_base_entries k
  LEFT JOIN knowledge_base_embeddings e ON e.knowledge_base_entry_id = k.id
 WHERE k.is_published GROUP BY 1 ORDER BY 2;
```

A published entry with zero chunks has not been learned — check the AI service
is running and read the backend log for `reindex task failed`.

---

## Forcing a reindex

Normally automatic. To force one entry, touch it:

```sql
UPDATE knowledge_base_entries SET updated_at = NOW() WHERE id = 7;
```

To rebuild everything (after a model or chunk-size change):

```sql
DELETE FROM knowledge_base_embeddings;
UPDATE knowledge_base_entries SET updated_at = NOW();
```

Then run the backend's `npm run tasks` and rebuild the index:
`REINDEX INDEX kbe_vec_idx;`

---

## Testing it directly

```bash
KEY=$INTERNAL_API_KEY

curl -s localhost:8000/health

curl -s -X POST localhost:8000/internal/ai/generate \
  -H 'content-type: application/json' -H "x-internal-key: $KEY" \
  -d '{"question":"How long does a poster take?"}'

curl -s -X POST localhost:8000/internal/ai/reindex \
  -H 'content-type: application/json' -H "x-internal-key: $KEY" \
  -d '{"knowledge_base_entry_id":1,"title":"Test","content":"Posters take two working days."}'
```

---

## Boundaries you must not cross

- **Never give this service a writing database credential.** It uses
  `printshop_ai`, which holds `SELECT` on two tables (see
  `backend/migrations/0003_ai_readonly_role.sql`). That is Decision D-4 and it is
  what makes a prompt-injection attack boring. `db.ts` also refuses any statement
  that does not start with `SELECT`.
- **Never expose the port publicly.** Bind `127.0.0.1`; its only client is the
  backend (D-6).
- **Never let it INSERT embeddings.** It returns them; the backend writes them
  (D-5).
- **Keep the schemas in step.** The Zod schemas in
  `ai-service/src/app/internal/ai/*/route.ts` and the types in
  `backend/src/ai/client.ts` are one contract in two files. Change one, change
  both.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Always "I don't have that…" | Nothing indexed, or `MAX_DISTANCE` too low | Check the chunks query above; try 0.8 |
| Answers are off-topic | `MAX_DISTANCE` too high | Lower toward 0.5 |
| First request very slow | Model loading | Expected once per boot; run `npm run warmup` |
| 403 `FORBIDDEN` | `INTERNAL_API_KEY` differs between the two apps | Make them identical, restart both |
| `dimension mismatch` on insert | Model and `VECTOR(n)` disagree | [04-database.md](04-database.md) |
| `permission denied for table` | Read-only role, as designed | You are trying to write from the AI service — don't |
| 500 from `/generate` | Database unreachable | Check `AI_DATABASE_URL` |
