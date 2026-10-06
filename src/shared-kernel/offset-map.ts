import type { CharRange } from './char-range';

/**
 * Maps offsets in normalized text back to the original text.
 * Each normalized character remembers the original cluster [start, end) it came from.
 */
export class OffsetMap {
  constructor(
    private readonly starts: readonly number[],
    private readonly ends: readonly number[],
  ) {}

  /** Original range covering every cluster that produced normalized characters [start, end). */
  toOriginal(range: CharRange): CharRange {
    const start = this.starts[range.start];
    const end = this.ends[range.end - 1];
    if (start === undefined || end === undefined) throw new RangeError('OffsetMap: range outside normalized text');
    return { start, end };
  }
}
