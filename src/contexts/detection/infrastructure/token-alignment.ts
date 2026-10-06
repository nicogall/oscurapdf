import type { CharRange } from '@shared-kernel';

/** Tokens found further than this from the previous one are treated as unalignable. */
const MAX_GAP = 24;

/** The token text without WordPiece ("##") or SentencePiece ("▁") markers. */
export const tokenPiece = (token: string): string => token.replace(/^##/, '').replace(/^▁/, '');

const isPunctuation = (token: string): boolean => /^[^\p{L}\p{N}]+$/u.test(tokenPiece(token));

/**
 * Which tokens begin a word. SentencePiece marks word starts with "▁"; WordPiece marks
 * continuations with "##". Punctuation is always a word of its own, and so is what follows it:
 * SentencePiece glues "," to the previous piece, which would turn "Esposito," into one "word".
 */
export const wordStarts = (tokens: readonly string[]): boolean[] => {
  const sentencePiece = tokens.some((token) => token.startsWith('▁'));
  return tokens.map((token, i) => {
    const previous = tokens[i - 1];
    if (i === 0 || isPunctuation(token) || (previous !== undefined && isPunctuation(previous))) return true;
    return sentencePiece ? token.startsWith('▁') : !token.startsWith('##');
  });
};

/**
 * Aligns tokenizer output to character offsets by scanning the text left to right.
 * Unalignable tokens ([UNK], normalization differences) get undefined and do not move the cursor.
 */
export const alignTokens = (text: string, tokens: readonly string[]): Array<CharRange | undefined> => {
  let cursor = 0;
  return tokens.map((token) => {
    const piece = tokenPiece(token);
    if (piece.length === 0) return undefined;
    const at = text.indexOf(piece, cursor);
    if (at === -1 || at - cursor > MAX_GAP) return undefined;
    cursor = at + piece.length;
    return { start: at, end: cursor };
  });
};
