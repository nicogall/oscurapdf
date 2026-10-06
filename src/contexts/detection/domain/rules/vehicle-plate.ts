import type { DetectionCandidate } from '@shared-kernel/published';
import type { Detector, DetectionInput } from '../detector';
import { caseless } from './caseless-pattern';
import { originalCandidate } from './original-text-match';

/** Italian plates since 1994: AA 000 AA, in capitals, never with I, O, Q or U. */
const LETTERS = '[A-HJ-NPR-TV-Z]{2}';
const CURRENT_FORMAT = new RegExp(`(?<![\\p{L}\\p{N}])${LETTERS}[ -]?\\d{3}[ -]?${LETTERS}(?![\\p{L}\\p{N}])`, 'gu');

const KEYWORDS = ['targa', 'targato', 'targata', 'tg.', 'number plate', 'license plate', 'licence plate', 'registration number', 'registration no.', 'plate number', 'plate no.'];
/** Older, foreign and motorcycle plates have no fixed shape: up to three groups of capitals and digits. */
const GROUPS = '([A-Z0-9]{1,7}(?:[ -][A-Z0-9]{1,6}){0,2})(?![\\p{L}\\p{N}])';
const AFTER_KEYWORD = new RegExp(`(?<![\\p{L}])(?:${KEYWORDS.map(caseless).join('|')})(?![\\p{L}])[ \\t]*(?:[nN]\\.[ \\t]*)?:?[ \\t]*${GROUPS}`, 'dgu');

const MIN_CHARACTERS = 5;
const MAX_CHARACTERS = 9;

/** A plate mixes letters and digits and is 5 to 9 characters long. */
const isPlateShaped = (groups: string): boolean => {
  const compact = groups.replace(/[ -]/g, '');
  return compact.length >= MIN_CHARACTERS && compact.length <= MAX_CHARACTERS && /[A-Z]/u.test(compact) && /\d/u.test(compact);
};

/** The longest run of leading groups that is still a plate ("MI 123456 DEL" → "MI 123456"). */
const plateIn = (groups: string): string | undefined => {
  const separators = [...groups.matchAll(/[ -]/g)].map((m) => m.index);
  return [groups.length, ...separators.reverse()].map((end) => groups.slice(0, end)).find(isPlateShaped);
};

const announcedPlates = (input: DetectionInput): DetectionCandidate[] =>
  [...input.text.matchAll(AFTER_KEYWORD)].flatMap((m) => {
    const start = m.indices?.[1]?.[0];
    const plate = plateIn(m[1] ?? '');
    return start === undefined || plate === undefined ? [] : originalCandidate(input, { start, end: start + plate.length }, 'VEHICLE_PLATE', 'high');
  });

const currentFormatPlates = (input: DetectionInput): DetectionCandidate[] =>
  [...input.text.matchAll(CURRENT_FORMAT)].flatMap((m) => originalCandidate(input, { start: m.index, end: m.index + m[0].length }, 'VEHICLE_PLATE', 'high'));

/** Vehicle number plates: the current Italian format anywhere, any other format after a keyword (High). */
export const vehiclePlateDetector: Detector = {
  name: 'vehicle-plate',
  detect: (input) => {
    const announced = announcedPlates(input);
    const known = new Set(announced.map((c) => c.range.start));
    return [...announced, ...currentFormatPlates(input).filter((c) => !known.has(c.range.start))].sort((a, b) => a.range.start - b.range.start);
  },
};
