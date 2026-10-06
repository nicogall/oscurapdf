import type { CharRange } from '@shared-kernel';

const SPAN_SELECTOR = '[data-char-start]';

const spanStart = (span: Element): number => Number((span as HTMLElement).dataset.charStart);

const spanEnd = (span: Element): number => spanStart(span) + span.textContent.length;

const closestSpan = (node: Node): Element | null =>
  (node instanceof Element ? node : node.parentElement)?.closest(SPAN_SELECTOR) ?? null;

/** Span at or after/before a child position of the text layer element. */
const spanAround = (layer: Element, offset: number, edge: 'start' | 'end'): Element | undefined => {
  const children = [...layer.children].filter((child) => child.matches(SPAN_SELECTOR));
  const all = [...layer.childNodes];
  const before = children.filter((child) => all.indexOf(child) < offset);
  return edge === 'start' ? children.find((child) => all.indexOf(child) >= offset) : before.at(-1);
};

/** Document offset of a DOM boundary point, or undefined if it is not in the text layer. */
const toOffset = (node: Node, offset: number, edge: 'start' | 'end'): number | undefined => {
  const span = closestSpan(node);
  if (span !== null) {
    if (node.nodeType === Node.TEXT_NODE) return spanStart(span) + offset;
    return offset === 0 ? spanStart(span) : spanEnd(span);
  }
  if (!(node instanceof Element) || !node.classList.contains('text-layer')) return undefined;
  const around = spanAround(node, offset, edge);
  if (around === undefined) return undefined;
  return edge === 'start' ? spanStart(around) : spanEnd(around);
};

/** Maps a DOM selection range over the text layer to TextModel character offsets (research R2). */
export const rangeToCharRange = (range: Range): CharRange | undefined => {
  if (range.collapsed) return undefined;
  const start = toOffset(range.startContainer, range.startOffset, 'start');
  const end = toOffset(range.endContainer, range.endOffset, 'end');
  if (start === undefined || end === undefined || end <= start) return undefined;
  return { start, end };
};
