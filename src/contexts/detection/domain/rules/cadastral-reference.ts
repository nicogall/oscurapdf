import type { Detector } from '../detector';
import { candidateAt, matchesOf } from './pattern-match';

const NUMBER = '(?:n\\. ?)?\\d+[a-z]?';
const PARCEL = '(?:particella|mappale|p\\.lla|part\\.|mapp\\.)';
const UNIT = '(?:subalterno|sub\\.?)';
/** "Foglio 304, particella 3567, sub. 419": the land-registry coordinates of one property. */
const REFERENCE = new RegExp(`(?<![\\p{L}])foglio ${NUMBER},? ${PARCEL} ${NUMBER}(?:,? ${UNIT} ${NUMBER})?(?![\\p{L}\\p{N}])`, 'gu');

/** Cadastral data identify a property, and through it its owner: reported as an identifier (High). */
export const cadastralReferenceDetector: Detector = {
  name: 'cadastral-reference',
  detect: (input) => matchesOf(input, REFERENCE).flatMap((m) => candidateAt(input, m.range, 'CONTEXTUAL_ID', 'high')),
};
