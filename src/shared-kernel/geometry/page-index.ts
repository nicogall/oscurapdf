import { err, ok, type Result } from '../result';

/** Zero-based page number. */
export type PageIndex = number & { readonly __brand: 'PageIndex' };

export const createPageIndex = (value: number): Result<PageIndex, 'invalidPageIndex'> =>
  Number.isInteger(value) && value >= 0 ? ok(value as PageIndex) : err('invalidPageIndex');
