import { unionOfBoxes, type CharRange, type PageArea } from '@shared-kernel';
import type { TextSpan } from './text-span';

const areaForSpan = (span: TextSpan, range: CharRange): PageArea | undefined => {
  const from = Math.max(range.start, span.range.start) - span.range.start;
  const to = Math.min(range.end, span.range.end) - span.range.start;
  const box = unionOfBoxes(span.charBoxes.slice(from, to));
  return box === undefined ? undefined : { page: span.page, box };
};

/** One area per line fragment of the range; a range crossing pages yields areas on each page. */
export const buildAreas = (spans: readonly TextSpan[], range: CharRange): PageArea[] =>
  spans
    .filter((span) => span.range.start < range.end && range.start < span.range.end)
    .map((span) => areaForSpan(span, range))
    .filter((area): area is PageArea => area !== undefined);
