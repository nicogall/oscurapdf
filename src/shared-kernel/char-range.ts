import { err, ok, type Result } from './result';

/** Half-open range of document-level character offsets: 0 ≤ start < end. */
export interface CharRange {
  readonly start: number;
  readonly end: number;
}

export const createCharRange = (start: number, end: number): Result<CharRange, 'invalidCharRange'> =>
  Number.isInteger(start) && Number.isInteger(end) && start >= 0 && start < end
    ? ok({ start, end })
    : err('invalidCharRange');

export const rangesOverlap = (a: CharRange, b: CharRange): boolean => a.start < b.end && b.start < a.end;
