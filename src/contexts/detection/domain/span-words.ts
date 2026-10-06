import type { CharRange } from '@shared-kernel';

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** A name never continues on the next line ("Hannah Edwards⏎Head of Operations"). */
export const firstLine = (text: string, range: CharRange): CharRange => {
  const lineBreak = text.slice(range.start, range.end).search(/[\n\f]/u);
  return lineBreak === -1 ? range : { start: range.start, end: range.start + lineBreak };
};

export const wordsIn = (text: string, range: CharRange): Word[] =>
  [...text.slice(range.start, range.end).matchAll(/\S+/gu)].map((m) => ({ text: m[0], start: range.start + m.index, end: range.start + m.index + m[0].length }));
