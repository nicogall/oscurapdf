import type { PageIndex } from '@shared-kernel';

export type PageRotation = 0 | 90 | 180 | 270;

export interface PageSize {
  readonly width: number;
  readonly height: number;
}

/** A page as displayed: size in points after rotation. */
export interface Page {
  readonly index: PageIndex;
  readonly size: PageSize;
  readonly rotation: PageRotation;
  readonly hasExtractableText: boolean;
  readonly hasImages: boolean;
}
