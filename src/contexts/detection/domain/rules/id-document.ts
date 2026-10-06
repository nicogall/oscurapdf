import type { Detector } from '../detector';
import { ID_DOCUMENT_KEYWORDS, hasContextBefore } from './context-keywords';
import { candidateAt, matchesOf } from './pattern-match';

/** Italian electronic ID card (CA00000AA) and passport / paper ID (AA0000000). */
const DOCUMENT_NUMBER = /(?<![\p{L}\p{N}])(?:[a-z]{2}\d{5}[a-z]{2}|[a-z]{2}\d{7})(?![\p{L}\p{N}])/gu;
const CONTEXT_WINDOW = 50;

/** Too ambiguous alone: reported (High) only after an ID-document keyword. */
export const idDocumentDetector: Detector = {
  name: 'id-document',
  detect: (input) =>
    matchesOf(input, DOCUMENT_NUMBER)
      .filter((m) => hasContextBefore(input.normalized.normalized, m.range.start, ID_DOCUMENT_KEYWORDS, CONTEXT_WINDOW))
      .flatMap((m) => candidateAt(input, m.range, 'ID_DOCUMENT', 'high')),
};
