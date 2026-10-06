import type { Detector } from '../detector';
import { caseless } from './caseless-pattern';
import { originalCandidate } from './original-text-match';

/** Street types that are not ordinary words: matched in any case ("via Roma 12", "Via Roma 12"). */
const CASELESS_TYPES = [
  'via', 'viale', 'vialetto', 'vicolo', 'vicoletto', 'vico', 'piazza', 'piazzale', 'piazzetta', 'contrada', 'località', 'frazione',
  'lungomare', 'lungotevere', 'lungolago', 'lungarno', 'traversa', 'circonvallazione', 'scalinata', 'borgata',
];
/** Abbreviations, in any case: "Trav.", "V.le", "P.za", "L.go", "Fraz."… */
const ABBREVIATIONS = [
  'v.', 'v.le', 'vle', 'p.zza', 'p.za', 'pza', 'p.le', 'p.tta', 'c.so', 'l.go', 'lgo', 'vic.', 'str.', 'c.da', 'loc.', 'fraz.', 'trav.',
  'b.go', 'sal.', 'gall.', 'circ.ne',
];
/** Also ordinary words ("corso di laurea", "largo anticipo"): street types only when capitalised. */
const CAPITALISED_TYPES = ['Corso', 'Largo', 'Strada', 'Stradone', 'Stradella', 'Borgo', 'Salita', 'Discesa', 'Rampa', 'Galleria', 'Calle', 'Campo', 'Fondamenta', 'Rione', 'Passaggio'];

const byLength = (a: string, b: string): number => b.length - a.length;
const STREET_TYPE = `(?:${[...[...CASELESS_TYPES, ...ABBREVIATIONS].sort(byLength).map(caseless), ...CAPITALISED_TYPES.sort(byLength)].join('|')})`;
/** "II Traversa", "3ª Traversa", "1° Vico". */
const ORDINAL = "(?:(?:[IVX]{1,4}|\\d{1,2}[ªa°º]?)[ \\t]+)?";
const NAME_PART = "(?:(?:dei|degli|della|delle|del|dello|di|da|de|d'|san|santa|santo)[ \\t]+|[\\p{Lu}\\d][\\p{L}'’.\\d-]*[ \\t]+)";
const HOUSE_NUMBER = '(?:n\\.?\\s*|nr\\.?\\s*)?\\d{1,4}(?:[ \\t]?[A-Za-z](?![\\p{L}]))?(?:/[\\p{L}\\d]+)?(?:[ \\t](?:bis|ter|quater)(?![\\p{L}]))?';
/** Between the house number, the CAP and the city: a comma, a dash, or spaces (same line only). */
const TAIL_SEP = '(?:[ \\t]*[,\\-–][ \\t]*|[ \\t]+)';
/** "Milano", "Busto Arsizio", "Barcellona Pozzo di Gotto": up to four words, with small links. */
const CITY = "\\p{Lu}[\\p{L}'’-]+(?:[ \\t]+(?:(?:di|del|della|sul|in)[ \\t]+)?\\p{Lu}[\\p{L}'’-]+){0,2}";
const TAIL = `(?:${TAIL_SEP}\\d{5})?(?:${TAIL_SEP}${CITY}(?:[ \\t]+\\(\\p{Lu}{2}\\))?)?`;
const ITALIAN = new RegExp(`(?<![\\p{L}\\d])${ORDINAL}${STREET_TYPE}[ \\t]+${NAME_PART}{0,6}?${NAME_PART.replace('[ \\t]+)', ')')},?[ \\t]*${HOUSE_NUMBER}(?:${TAIL})?`, 'gu');
const ENGLISH = new RegExp(
  "(?<![\\p{L}\\p{N}])\\d{1,5}[ \\t]+(?:\\p{Lu}[\\p{L}'’.-]*[ \\t]+){1,4}(?:Street|St\\.|Road|Rd\\.|Avenue|Ave\\.|Lane|Ln\\.|Drive|Dr\\.|Boulevard|Blvd\\.|Way|Court|Ct\\.|Place|Square)",
  'gu',
);

/** "inviato via Email", "via PEC": here "via" means "by means of", not a street. */
const BY_MEANS_OF = /^via[ \t]+(?:e-?mail|mail|pec|fax|posta|sms|whatsapp|telegram|web|internet|app|telefono|raccomandata|corriere|bonifico)(?![\p{L}])/iu;

const isStreet = (match: string): boolean => !BY_MEANS_OF.test(match);

/** A street with a house number (optionally CAP and city): an address, High. */
export const addressDetector: Detector = {
  name: 'address',
  detect: (input) =>
    [ITALIAN, ENGLISH].flatMap((pattern) =>
      [...input.text.matchAll(pattern)]
        .filter((m) => isStreet(m[0]))
        .flatMap((m) => originalCandidate(input, { start: m.index, end: m.index + m[0].trimEnd().length }, 'LOCATION', 'high')),
    ),
};
