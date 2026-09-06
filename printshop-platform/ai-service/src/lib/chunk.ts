/**
 * Chunking.
 *
 * Sliding window over words: 150 words per chunk with a 25-word overlap, so a
 * sentence straddling a boundary still appears whole in one of the two chunks.
 * Paragraph breaks are respected first — a chunk never mixes two topics unless
 * the paragraph itself is longer than the window.
 */
import { config } from "./config";

export function chunkText(content: string): string[] {
  const { chunkWords, chunkOverlapWords } = config();
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length) {
      chunks.push(buffer.join(" "));
      buffer = [];
    }
  };

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ");

    if (words.length > chunkWords) {
      flush();
      const step = Math.max(1, chunkWords - chunkOverlapWords);
      for (let i = 0; i < words.length; i += step) {
        const slice = words.slice(i, i + chunkWords);
        if (slice.length) chunks.push(slice.join(" "));
        if (i + chunkWords >= words.length) break;
      }
      continue;
    }

    if (buffer.length + words.length > chunkWords) flush();
    buffer.push(...words);
  }
  flush();

  return chunks.length ? chunks : [content.replace(/\s+/g, " ").trim()].filter(Boolean);
}
