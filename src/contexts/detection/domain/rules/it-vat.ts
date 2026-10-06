import { isValidPartitaIva } from '../checksums/partita-iva-check';
import type { Detector } from '../detector';
import { VAT_KEYWORDS, hasContextBefore } from './context-keywords';
import { candidateAt, matchesOf } from './pattern-match';

const VAT = /(?<![\p{L}\p{N}])(?:it ?)?\d{11}(?![\p{N}])/gu;

const KEYWORD_WINDOW = 40;
/** With a wrong check digit the keyword must be right before the number ("P.IVA IT01234567890"). */
const ADJACENT_KEYWORD_WINDOW = 16;

/**
 * Eleven digits after a VAT keyword → High. The check digit is not required when the keyword is
 * right before the number (clarification 2026-10-04): the text itself says what it is. Without a
 * keyword the long-number rule covers it.
 */
export const itVatDetector: Detector = {
  name: 'it-vat',
  detect: (input) =>
    matchesOf(input, VAT)
      .filter((m) => {
        const window = isValidPartitaIva(m.value.replace(/^it ?/, '')) ? KEYWORD_WINDOW : ADJACENT_KEYWORD_WINDOW;
        return hasContextBefore(input.normalized.normalized, m.range.start, VAT_KEYWORDS, window);
      })
      .flatMap((m) => candidateAt(input, m.range, 'IT_VAT', 'high')),
};
