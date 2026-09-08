/**
 * Non-streaming answer generation — the classic one-shot twin of `stream.ts`.
 * Kept for callers that want the whole answer in a single JSON payload.
 *
 * Grounding rules, in order:
 *  1. No passages cleared the distance filter → say so. Never invent studio
 *     policy, prices or turnaround times.
 *  2. An LLM is configured → it may only rephrase the passages, and the system
 *     prompt says so explicitly. The retrieved text is passed as data, and the
 *     prompt tells the model to ignore instructions found inside it.
 *  3. No LLM configured → return the best passages verbatim. Less fluent,
 *     equally true, and the service still works with zero external dependency.
 */
import { config } from './config';
import type { Passage } from './retrieval';
import { extractive, NO_ANSWER, sourcesOf, SYSTEM_PROMPT } from './stream';

/**
 * Default endpoint is the Lovable AI Gateway — free, no external account.
 * Any OpenAI-compatible Responses API works (the gateway, a local vLLM...).
 * GPT-5.6-family models require the Responses API: `instructions` +
 * `input`, `max_output_tokens`, and no `temperature` (rejected with 400).
 *
 * Internally this consumes the streaming endpoint to completion rather than
 * making a buffered call: reasoning models routinely run for minutes, and a
 * non-streaming HTTP call that long risks being killed by platform timeouts.
 */
async function viaLlm(question: string, passages: Passage[]): Promise<string | null> {
  const { llmApiUrl, llmApiKey, llmModel } = config();
  if (!llmApiUrl) return null;

  const context = passages
    .map((p, i) => `[${i + 1}] ${p.title}\n${p.chunkText}`)
    .join('\n\n');

  try {
    const res = await fetch(llmApiUrl.replace(/\/$/, '') + '/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(llmApiKey ? { authorization: `Bearer ${llmApiKey}`, 'Lovable-API-Key': llmApiKey } : {}),
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: llmModel,
        instructions: SYSTEM_PROMPT,
        input: `Passages:\n${context}\n\nCustomer question: ${question}`,
        max_output_tokens: 600,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) {
      console.error('[llm]', res.status, (await res.text().catch(() => '')).slice(0, 300));
      return null;
    }

    // Drain the SSE stream; only the answer text is kept.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let cut: number;
      while ((cut = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, cut);
        buffer = buffer.slice(cut + 2);
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const evt = JSON.parse(raw) as {
              type?: string;
              delta?: string;
              response?: { output_text?: string };
            };
            if (evt.type === 'response.output_text.delta' && evt.delta) answer += evt.delta;
            else if (evt.type === 'response.completed' && !answer)
              answer = evt.response?.output_text?.trim() ?? '';
          } catch {
            // keepalive / partial frame
          }
        }
      }
    }
    answer = answer.trim();
    return answer || null;
  } catch (e) {
    console.error('[llm]', e);
    return null;
  }
}

export async function generate(question: string, passages: Passage[]) {
  if (!passages.length) return { answer: NO_ANSWER, sources: [] as string[] };

  const fromLlm = await viaLlm(question, passages);
  return {
    answer: fromLlm ?? extractive(passages),
    sources: sourcesOf(passages),
  };
}
