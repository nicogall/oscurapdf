import { OffsetMap } from './offset-map';

/**
 * The ONE text normalization of the application (analysis finding U2), used for occurrence
 * matching, the redaction key, detection and verification:
 * NFKC, zero-width characters removed, whitespace runs collapsed to one space, case-folded.
 */
export interface NormalizedText {
  readonly normalized: string;
  readonly offsets: OffsetMap;
}

const ZERO_WIDTH = /[​-‍⁠﻿­]/u;
const WHITESPACE = /\s/u;
/** A base code point followed by any combining marks: normalized together so NFKC can compose. */
const CLUSTER = /\P{M}\p{M}*|\p{M}+/gsu;

interface Builder {
  chars: string[];
  starts: number[];
  ends: number[];
  lastWasSpace: boolean;
}

/** One map entry per UTF-16 code unit, so offsets match `string.length` indexing. */
const append = (builder: Builder, text: string, start: number, end: number): void => {
  builder.chars.push(text);
  for (let unit = 0; unit < text.length; unit++) {
    builder.starts.push(start);
    builder.ends.push(end);
  }
};

/** A piece whose base character is whitespace becomes one space (its marks are dropped). */
const appendPiece = (builder: Builder, piece: string, start: number, end: number): void => {
  if (ZERO_WIDTH.test(piece)) return;
  if (WHITESPACE.test(piece.charAt(0))) {
    if (!builder.lastWasSpace) append(builder, ' ', start, end);
    builder.lastWasSpace = true;
    return;
  }
  append(builder, piece, start, end);
  builder.lastWasSpace = false;
};

/**
 * NFKC can turn one cluster into several (e.g. "˘" → space + combining breve), so the folded
 * output is re-split into clusters before the whitespace/zero-width rules. This keeps the
 * normalization idempotent.
 */
const appendCluster = (builder: Builder, cluster: string, start: number): void => {
  const end = start + cluster.length;
  const folded = cluster.normalize('NFKC').toLowerCase();
  for (const match of folded.matchAll(CLUSTER)) appendPiece(builder, match[0], start, end);
};

export const normalizeText = (text: string): NormalizedText => {
  const builder: Builder = { chars: [], starts: [], ends: [], lastWasSpace: false };
  for (const match of text.matchAll(CLUSTER)) appendCluster(builder, match[0], match.index);
  return { normalized: builder.chars.join(''), offsets: new OffsetMap(builder.starts, builder.ends) };
};
