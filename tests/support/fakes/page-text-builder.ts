import type { PageText } from '@ingestion';

export const CHAR_WIDTH = 5;
export const LINE_HEIGHT = 12;

/** Builds synthetic page text: every character is CHAR_WIDTH wide, every line LINE_HEIGHT tall. */
export const pageText = (page: number, lines: readonly string[]): PageText => ({
  page,
  lines: lines.map((line, lineIndex) => ({
    chars: Array.from(line).map((char, i) => ({
      char,
      box: { x: 10 + i * CHAR_WIDTH, y: 10 + lineIndex * LINE_HEIGHT, width: CHAR_WIDTH, height: LINE_HEIGHT },
    })),
  })),
});
