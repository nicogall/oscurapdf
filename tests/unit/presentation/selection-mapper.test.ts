// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { rangeToCharRange } from '../../../src/presentation/viewer/selection-mapper';

let layer: HTMLDivElement;

beforeEach(() => {
  document.body.innerHTML = `
    <div class="text-layer" id="layer">
      <span data-char-start="0">The agreement is between ACME</span>
      <span data-char-start="30">Holdings Ltd. and John Smith.</span>
    </div>
    <p id="outside">outside</p>`;
  layer = document.getElementById('layer') as HTMLDivElement;
});

const textOf = (index: number): Text => layer.querySelectorAll('span')[index]?.firstChild as Text;

const range = (startNode: Node, startOffset: number, endNode: Node, endOffset: number): Range => {
  const r = document.createRange();
  r.setStart(startNode, startOffset);
  r.setEnd(endNode, endOffset);
  return r;
};

describe('rangeToCharRange (DOM Range → document offsets)', () => {
  it('maps a selection inside one span', () => {
    expect(rangeToCharRange(range(textOf(0), 25, textOf(0), 29))).toEqual({ start: 25, end: 29 });
  });

  it('maps a selection across spans and lines', () => {
    expect(rangeToCharRange(range(textOf(0), 25, textOf(1), 13))).toEqual({ start: 25, end: 43 });
  });

  it('maps element boundary points (whole span selected)', () => {
    const second = layer.querySelectorAll('span')[1] as HTMLElement;
    expect(rangeToCharRange(range(second, 0, second, 1))).toEqual({ start: 30, end: 59 });
  });

  it('maps boundaries on the text layer itself to span edges', () => {
    const spans = layer.querySelectorAll('span');
    const childIndex = (span: Element | undefined) => [...layer.childNodes].indexOf(span as ChildNode);
    expect(rangeToCharRange(range(layer, childIndex(spans[1]), layer, childIndex(spans[1]) + 1))).toEqual({ start: 30, end: 59 });
  });

  it('returns undefined for collapsed or outside selections', () => {
    expect(rangeToCharRange(range(textOf(0), 3, textOf(0), 3))).toBeUndefined();
    const outside = document.getElementById('outside')?.firstChild as Text;
    expect(rangeToCharRange(range(outside, 0, outside, 3))).toBeUndefined();
  });
});
