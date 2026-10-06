export interface TextChunk {
  readonly start: number;
  readonly text: string;
}

/** Keeps each chunk well under the models' 512-token limit. */
export const MAX_CHUNK_CHARS = 1000;

const LINE_BREAK = /[\n\f]/g;

const lineStarts = (text: string): number[] => [0, ...[...text.matchAll(LINE_BREAK)].map((m) => m.index + 1)];

/** Splits an over-long line at the last space before the limit (or hard, if there is none). */
const splitPoint = (text: string, start: number, limit: number): number => {
  const space = text.lastIndexOf(' ', start + limit);
  return space > start ? space + 1 : start + limit;
};

/**
 * Chunks at line boundaries. Each chunk after the first starts with the last line of the previous
 * chunk (a one-line overlap), so an entity broken across a chunk boundary is still seen whole.
 */
export const chunkText = (text: string, maxChars = MAX_CHUNK_CHARS): TextChunk[] => {
  const starts = [...lineStarts(text), text.length];
  const chunks: TextChunk[] = [];
  let chunkStart = 0;
  while (chunkStart < text.length) {
    const fitting = starts.filter((s) => s > chunkStart && s - chunkStart <= maxChars);
    const end = fitting.at(-1) ?? splitPoint(text, chunkStart, maxChars);
    chunks.push({ start: chunkStart, text: text.slice(chunkStart, end) });
    if (end >= text.length) break;
    const lastLine = starts.filter((s) => s > chunkStart && s < end).at(-1);
    chunkStart = lastLine !== undefined && end - lastLine < maxChars / 2 ? lastLine : end;
  }
  return chunks;
};
