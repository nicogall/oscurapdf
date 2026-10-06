import type { BoundingBox, PageIndex } from '@shared-kernel';
import type { PageLine, PageText } from './page-text';
import type { TextSpan } from './text-span';

const LINE_SEPARATOR = '\n';
const PAGE_SEPARATOR = '\f';

interface Accumulator {
  readonly parts: string[];
  readonly spans: TextSpan[];
  offset: number;
}

const pushSeparator = (acc: Accumulator, separator: string): void => {
  acc.parts.push(separator);
  acc.offset += separator.length;
};

/** One box per UTF-16 code unit, so astral characters keep offsets aligned. */
const boxesPerCodeUnit = (line: PageLine): BoundingBox[] =>
  line.chars.flatMap(({ char, box }) => Array.from({ length: char.length }, () => box));

const pushLine = (acc: Accumulator, page: PageIndex, lineIndex: number, line: PageLine): void => {
  const text = line.chars.map((c) => c.char).join('');
  if (text.length === 0) return;
  const range = { start: acc.offset, end: acc.offset + text.length };
  acc.spans.push({ page, range, line: lineIndex, charBoxes: boxesPerCodeUnit(line) });
  acc.parts.push(text);
  acc.offset = range.end;
};

/** Concatenates page texts: `\n` between lines, `\f` between pages. */
export const buildTextAndSpans = (pages: readonly PageText[]): { text: string; spans: TextSpan[] } => {
  const acc: Accumulator = { parts: [], spans: [], offset: 0 };
  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) pushSeparator(acc, PAGE_SEPARATOR);
    page.lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) pushSeparator(acc, LINE_SEPARATOR);
      pushLine(acc, page.page as PageIndex, lineIndex, line);
    });
  });
  return { text: acc.parts.join(''), spans: acc.spans };
};
