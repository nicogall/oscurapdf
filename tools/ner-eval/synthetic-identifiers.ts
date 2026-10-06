/** Generates well-formed identifiers for the SC-006 rules check (deterministic). */
import { luhnValid } from '../../src/contexts/detection/domain/checksums/luhn';

export const seededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

const digits = (random: () => number, count: number): string => Array.from({ length: count }, () => Math.floor(random() * 10)).join('');

/** Computes ISO 13616 check digits for a country + BBAN. */
export const ibanFor = (country: string, bban: string): string => {
  const rearranged = `${bban}${country}00`.toUpperCase();
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) remainder = Number(`${remainder}${numeric.slice(i, i + 7)}`) % 97;
  return `${country}${String(98 - remainder).padStart(2, '0')}${bban}`;
};

export const validCard = (random: () => number, prefix: string, length: number): string => {
  const body = prefix + digits(random, length - prefix.length - 1);
  for (let check = 0; check < 10; check++) if (luhnValid(`${body}${check}`)) return `${body}${check}`;
  throw new Error('unreachable');
};

export const syntheticIdentifiers = (count: number, seed = 7): { emails: string[]; ibans: string[]; cards: string[] } => {
  const random = seededRandom(seed);
  const names = ['anna', 'luca', 'john.smith', 'm.bianchi', 'giulia_rossi', 'p.verdi+work', 'sarah.o-neil'];
  const domains = ['example.com', 'example.it', 'mail.example.co.uk', 'studio-legale.example.it'];
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
  return {
    emails: Array.from({ length: count }, (_, i) => `${pick(names)}${i}@${pick(domains)}`),
    ibans: Array.from({ length: count }, (_, i) =>
      i % 2 === 0 ? ibanFor('IT', `X${digits(random, 22)}`) : ibanFor('DE', digits(random, 18)),
    ),
    cards: Array.from({ length: count }, (_, i) => (i % 2 === 0 ? validCard(random, '4', 16) : validCard(random, '51', 16))),
  };
};
