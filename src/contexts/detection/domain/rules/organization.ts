import type { DetectionCandidate } from '@shared-kernel/published';
import { mergeCandidates } from '../candidate-merging';
import type { Detector, DetectionInput } from '../detector';
import { isFormLabel } from '../form-labels';
import { caseless } from './caseless-pattern';
import { originalCandidate } from './original-text-match';

const WORD = "[\\p{Lu}\\d][\\p{L}\\p{N}'’&.-]*";
const PLAIN_WORD = "\\p{Lu}[\\p{L}'’-]*";
/** Small words inside a name: "Banca di Credito", "Ministero dell'Interno", "Smith & Sons". */
const SPACED_LINKS = ['di', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'e', 'per', 'of', 'and', 'for'];
const ELIDED_LINKS = ['dell', 'd', 'all', 'sull'];
const LINK = `(?:(?:${SPACED_LINKS.map(caseless).join('|')}|&)[ \\t]+|(?:${ELIDED_LINKS.map(caseless).join('|')})['’])`;

/** Dotted forms in any case ("S.r.l.", "s.p.a."); undotted ones only capitalised ("SRL", "Srl", never "spa"). */
const DOTTED_FORMS = ['s.r.l.s.', 's.r.l.', 's.p.a.', 's.a.s.', 's.n.c.', 's.s.', 's.c.a.r.l.', 's.c.r.l.', 's.c.p.a.', 's.c.', 's.a.p.a.', 'l.l.c.', 'soc. coop.'];
const PLAIN_FORMS = [
  'SRLS', 'Srls', 'SRL', 'Srl', 'SPA', 'SpA', 'Spa', 'SAS', 'Sas', 'SNC', 'Snc', 'SCARL', 'Scarl', 'ONLUS', 'Onlus', 'APS', 'ETS', 'ODV',
  'Ltd.', 'Ltd', 'LTD', 'LLC', 'LLP', 'Inc.', 'Inc', 'PLC', 'plc', 'GmbH', 'Corp.', 'Corp', 'S.A.', 'AG',
];
const LEGAL_FORM = `(?:${[...DOTTED_FORMS.map((form) => `${caseless(form.slice(0, -1))}\\.?`), ...PLAIN_FORMS.map((form) => form.replace(/\./g, '\\.'))].join('|')})`;
const MAX_NAME_WORDS = 4;
/** A word of the name is never a legal form itself ("Initech Ltd. and ACME LLC" are two companies). */
const NAME_WORD = `(?!${LEGAL_FORM}(?![\\p{L}\\p{N}]))${WORD}`;
const COMPANY = new RegExp(`(?<![\\p{L}\\p{N}.])${NAME_WORD}(?:[ \\t]+${LINK}?${NAME_WORD}){0,${MAX_NAME_WORDS - 1}}[ \\t]*,?[ \\t]+${LEGAL_FORM}(?![\\p{L}\\p{N}])`, 'gu');

/** Head words of public bodies and institutions; a proper name must follow ("Comune di Bari", "Banca Alpina"). */
const INSTITUTION_HEADS = [
  'camera di commercio', 'casa di cura', 'città metropolitana', 'guardia di finanza', 'comune', 'città', 'provincia', 'regione', 'ministero', 'prefettura',
  'questura', 'tribunale', 'corte', 'procura', 'agenzia', 'università', 'politecnico', 'ospedale', 'policlinico', 'clinica', 'istituto', 'banca',
  'fondazione', 'associazione', 'cooperativa', 'consorzio', 'studio', 'azienda', 'liceo', 'scuola', 'parrocchia', 'diocesi', 'asl', 'ausl', 'ats',
  'university', 'ministry', 'bank', 'hospital',
];
const capitalised = (words: string): string => words.replace(/(?<![\p{L}])\p{L}(?=\p{L}{3})/gu, (letter) => letter.toUpperCase());
const HEAD = `(?:${INSTITUTION_HEADS.flatMap((head) => [capitalised(head), head.toUpperCase()]).join('|')})`;
const QUALIFIERS = `(?:[ \\t]+${PLAIN_WORD}){0,3}`;
const LINKED_NAMES = `(?:[ \\t]+${LINK}${PLAIN_WORD}(?:[ \\t]+${PLAIN_WORD})?){0,2}`;
const INSTITUTION = new RegExp(`(?<![\\p{L}\\p{N}])(${HEAD})(${QUALIFIERS}${LINKED_NAMES})(?![\\p{L}\\p{N}])`, 'gu');

const TRAILING_DOT = /\.$/u;

const candidateFor = (input: DetectionInput, start: number, matched: string): DetectionCandidate[] =>
  originalCandidate(input, { start, end: start + matched.length }, 'ORGANIZATION', 'high');

/** "Alfa Servizi S.r.l.", "ACME HOLDINGS LTD": capitalised words closed by a legal form. */
const companies = (input: DetectionInput): DetectionCandidate[] => [...input.text.matchAll(COMPANY)].flatMap((m) => candidateFor(input, m.index, m[0]));

/** "Comune di residenza", "Provincia di Nascita": a form label follows, so the head word is a label too. */
const namesAnInstitution = (name: string): boolean => {
  const words = name.split(/[ \t'’]+/u).filter((word) => /^\p{Lu}/u.test(word));
  return words.length > 0 && !words.some(isFormLabel);
};

const institutions = (input: DetectionInput): DetectionCandidate[] =>
  [...input.text.matchAll(INSTITUTION)].flatMap((m) => (namesAnInstitution(m[2] ?? '') ? candidateFor(input, m.index, m[0].replace(TRAILING_DOT, '')) : []));

/** Companies (by legal form) and institutions (by head word): deterministic evidence, so High. */
export const organizationDetector: Detector = {
  name: 'organization',
  detect: (input) => mergeCandidates([...companies(input), ...institutions(input)]),
};
