import type { Detector, DetectionInput } from '../detector';
import { candidateAt, matchesOf, type NormalizedMatch } from './pattern-match';

/**
 * Top-level domains accepted without "http" or "www". A short list of common ones that are not
 * ordinary words keeps file names ("report.pdf") and abbreviations ("S.p.A.") out.
 */
const BARE_TLDS = ['it', 'com', 'org', 'net', 'eu', 'gov', 'edu', 'info', 'biz', 'io', 'app', 'dev', 'cloud', 'online', 'uk', 'de', 'fr', 'ch', 'sm'];

const HOST = '[a-z0-9-]+(?:\\.[a-z0-9-]+)*';
const PREFIXED = `(?:https?://|www\\.)${HOST}\\.[a-z]{2,24}`;
const BARE = `${HOST}\\.(?:${BARE_TLDS.join('|')})`;
/** Never inside an email ("@" on either side), and never starting in the middle of another address. */
const WEB_ADDRESS = new RegExp(`(?<![\\p{L}\\p{N}@._/-])(?:${PREFIXED}|${BARE})(?![\\p{L}\\p{N}@_-])(?::\\d{2,5})?(?:[/?#][^\\s<>"']*)?`, 'gu');

const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/u;
const HAS_PREFIX = /^(?:https?:\/\/|www\.)/iu;
/** "…fine.It follows": a full stop glued to a capitalised word is a sentence boundary, not a domain. */
const CAPITALISED_TLD = /^[^/?#:]*\.\p{Lu}\p{Ll}+(?=$|[/?#:])/u;

const withoutTrailingPunctuation = (match: NormalizedMatch): NormalizedMatch => {
  const value = match.value.replace(TRAILING_PUNCTUATION, '');
  return { value, range: { start: match.range.start, end: match.range.start + value.length } };
};

const isWebAddress = (input: DetectionInput, match: NormalizedMatch): boolean => {
  const { start, end } = input.normalized.offsets.toOriginal(match.range);
  const original = input.text.slice(start, end);
  return HAS_PREFIX.test(original) || !CAPITALISED_TLD.test(original);
};

/** Websites and links: "https://example.com/path", "www.example.it", "example.it" (High). */
export const urlDetector: Detector = {
  name: 'url',
  detect: (input) =>
    matchesOf(input, WEB_ADDRESS)
      .map(withoutTrailingPunctuation)
      .filter((m) => isWebAddress(input, m))
      .flatMap((m) => candidateAt(input, m.range, 'URL', 'high')),
};
