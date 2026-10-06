import { parseMarked } from '../../ner-eval/precision';
import { PRECISION_CORPUS } from '../../ner-eval/precision-corpus';
import { textPdf, type Fixture } from '../fixture';

const PHRASE = 'ACME Holdings Ltd.';

/** contract-it-en.pdf: "ACME Holdings Ltd." ×3 (case-insensitive), one split across a line break. */
const contract = async (): Promise<Fixture> => ({
  fileName: 'contract-it-en.pdf',
  bytes: await textPdf([
    [
      'SERVICE AGREEMENT / CONTRATTO DI SERVIZI',
      'This agreement is made between ACME',
      'Holdings Ltd. and John Smith, resident in Milano.',
      'Il presente contratto tra ACME Holdings Ltd. e Mario Rossi',
      'decorre dal primo giorno del mese successivo alla firma.',
    ],
    [
      'Payment terms: acme holdings ltd. shall pay within 30 days.',
      'The consultant Rossini is not a party to this agreement.',
    ],
  ]),
  truth: { phrase: PHRASE, occurrences: 3, pages: [0, 0, 1], splitAcrossLines: 1 },
});

const TEN_PAGE_LINES = 40;

const tenPageLine = (page: number, line: number): string =>
  `Section ${page + 1}.${line + 1}: synthetic clause text for performance measurements only.`;

/** ten-pages.pdf: the "typical 10-page document" of SC-001/SC-002. */
const tenPages = async (): Promise<Fixture> => ({
  fileName: 'ten-pages.pdf',
  bytes: await textPdf(
    Array.from({ length: 10 }, (_, page) => [
      `Contact: jane.doe${page}@example.com, +39 333 123 45${String(page).padStart(2, '0')}`,
      ...Array.from({ length: TEN_PAGE_LINES }, (_, line) => tenPageLine(page, line)),
    ]),
  ),
  truth: { pages: 10 },
});

const LONG_PAGES = 43;
const LINES_PER_PAGE = 45;
const LINE_CHARS = 95;

/** Wraps a paragraph at word boundaries, like a typeset page. */
const wrap = (paragraph: string): string[] =>
  paragraph.split(' ').reduce<string[]>((lines, word) => {
    const last = lines.at(-1);
    if (last !== undefined && last.length + word.length + 1 <= LINE_CHARS) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
    return lines;
  }, []);

/** long-document.pdf: 43 pages of varied realistic text (the evaluation documents, repeated). */
const longDocument = async (): Promise<Fixture> => {
  const lines = PRECISION_CORPUS.flatMap((doc) => parseMarked(doc.marked).text.split('\n').flatMap(wrap));
  const pageLines = (page: number) => Array.from({ length: LINES_PER_PAGE }, (_, i) => lines[(page * LINES_PER_PAGE + i) % lines.length] ?? '');
  return { fileName: 'long-document.pdf', bytes: await textPdf(Array.from({ length: LONG_PAGES }, (_, page) => pageLines(page))), truth: { pages: LONG_PAGES } };
};

export const generate = async (): Promise<Fixture[]> => [await contract(), await tenPages(), await longDocument()];
