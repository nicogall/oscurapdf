import type { BoundingBox } from '@shared-kernel';

/** Raw extraction result for one page, in page space. Produced by the PDF adapter. */
export interface PageText {
  readonly page: number;
  readonly lines: readonly PageLine[];
}

export interface PageLine {
  readonly chars: readonly PageChar[];
}

export interface PageChar {
  readonly char: string;
  readonly box: BoundingBox;
}
