import type { CharRange } from '@shared-kernel';

/** One non-O token from the model: `index` counts the leading special token (index - 1 = token). */
export interface TokenLabel {
  readonly index: number;
  readonly label: string;
  readonly score: number;
}

export interface LabeledSpan {
  readonly range: CharRange;
  readonly type: string;
  readonly score: number;
}

interface Word {
  readonly firstToken: number;
  range: CharRange | undefined;
}

interface Open {
  readonly type: string;
  lastWord: number;
  range: CharRange;
  readonly scores: number[];
}

const typeOf = (label: string): string => label.replace(/^[BI]-/, '');

/** Groups sub-word tokens into whole words (character ranges cover every piece of the word). */
const buildWords = (ranges: ReadonlyArray<CharRange | undefined>, starts: readonly boolean[]): Word[] => {
  const words: Word[] = [];
  ranges.forEach((range, token) => {
    const current = words.at(-1);
    if (current === undefined || starts[token] === true) {
      words.push({ firstToken: token, range });
      return;
    }
    if (range !== undefined) current.range = current.range === undefined ? range : { start: current.range.start, end: range.end };
  });
  return words;
};

const close = (open: Open): LabeledSpan => ({
  range: open.range,
  type: open.type,
  score: open.scores.reduce((a, b) => a + b, 0) / open.scores.length,
});

/** I- on the very next word, same type: the open entity grows to cover it. */
const extend = (open: Open, word: Word, label: TokenLabel | undefined, index: number): boolean => {
  if (label === undefined || word.range === undefined) return false;
  if (!label.label.startsWith('I-') || open.type !== typeOf(label.label) || open.lastWord !== index - 1) return false;
  open.range = { start: open.range.start, end: word.range.end };
  open.lastWord = index;
  open.scores.push(label.score);
  return true;
};

/**
 * Word-level aggregation ("first" strategy): each whole word takes the label of its first piece, so
 * an entity can never start or end inside a word (labels on later pieces alone, which produced
 * fragments like "ttadinanza", are ignored). B- starts an entity; I- continues it on the next word.
 */
export const aggregateEntities = (
  labels: readonly TokenLabel[],
  ranges: ReadonlyArray<CharRange | undefined>,
  starts: readonly boolean[],
): LabeledSpan[] => {
  const byToken = new Map(labels.map((label) => [label.index - 1, label]));
  const spans: LabeledSpan[] = [];
  let open: Open | undefined;
  buildWords(ranges, starts).forEach((word, index) => {
    const label = byToken.get(word.firstToken);
    if (open !== undefined && extend(open, word, label, index)) return;
    if (open !== undefined) spans.push(close(open));
    open = label === undefined || word.range === undefined ? undefined : { type: typeOf(label.label), lastWord: index, range: word.range, scores: [label.score] };
  });
  if (open !== undefined) spans.push(close(open));
  return spans;
};
