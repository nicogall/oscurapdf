import { unionOfBoxes, type PageArea, type PageIndex } from '@shared-kernel';
import type { PageLine, PageText } from './page-text';

/**
 * Characters expected in an Italian document: Latin letters (accents and ligatures included),
 * digits, ASCII punctuation and the usual typographic signs.
 */
const READABLE = /[\p{Script=Latin}0-9!-/:-@[-`{-~«»°€£§·•–—‘’‚“”„…′″±½¼¾¹²³µ©®™]/u;
const SPACE = /\s/u;

/** A line is unreadable when at least 3 of its characters, and 30% of them, are not expected. */
const MIN_SUSPICIOUS = 3;
const MAX_SUSPICIOUS_SHARE = 0.3;

/**
 * FR-037: a PDF with a broken character map draws readable glyphs but extracts control codes,
 * private-use or unrelated symbols. A few symbols (an icon, a Greek letter, an arrow) are fine.
 * An encoding that maps to other plain letters cannot be told apart from real text.
 */
export const isUnreadableLine = (text: string): boolean => {
  const visible = Array.from(text).filter((char) => !SPACE.test(char));
  const suspicious = visible.filter((char) => !READABLE.test(char)).length;
  return suspicious >= MIN_SUSPICIOUS && suspicious / visible.length >= MAX_SUSPICIOUS_SHARE;
};

/** Where text could not be read: pages to report and one zone per unreadable line. */
export interface UnreadableText {
  readonly pages: readonly PageIndex[];
  readonly zones: readonly PageArea[];
}

const lineText = (line: PageLine): string => line.chars.map((c) => c.char).join('');

const zoneOf = (page: number, line: PageLine): PageArea[] => {
  const box = unionOfBoxes(line.chars.map((c) => c.box));
  return box === undefined ? [] : [{ page: page as PageIndex, box }];
};

/** Removes unreadable lines from the text (no detection, no text selection) and returns them as zones. */
export const separateUnreadable = (pages: readonly PageText[]): { pages: readonly PageText[]; unreadable: UnreadableText } => {
  const zones: PageArea[] = [];
  const readable = pages.map((page) => {
    const unreadable = page.lines.filter((line) => isUnreadableLine(lineText(line)));
    if (unreadable.length === 0) return page;
    zones.push(...unreadable.flatMap((line) => zoneOf(page.page, line)));
    return { ...page, lines: page.lines.filter((line) => !unreadable.includes(line)) };
  });
  const unreadablePages = [...new Set(zones.map((zone) => zone.page))];
  return { pages: readable, unreadable: { pages: unreadablePages, zones } };
};
