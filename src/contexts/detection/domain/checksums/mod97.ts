/** IBAN lengths per country (ISO 13616 registry, the countries this MVP needs to recognise). */
export const IBAN_LENGTHS: Readonly<Record<string, number>> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18,
  FR: 27, GB: 22, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21,
  MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22,
};

/** A → 10 … Z → 35 (input is validated ASCII). */
const toDigits = (rearranged: string): string => rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

/** ISO 7064 mod 97-10 over the rearranged IBAN, computed in chunks (no big integers). */
const mod97 = (digits: string): number => {
  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) remainder = Number(`${remainder}${digits.slice(i, i + 7)}`) % 97;
  return remainder;
};

/** `iban` without spaces. Valid if the country length matches and mod 97 equals 1. */
export const isValidIban = (iban: string): boolean => {
  const compact = iban.toUpperCase();
  const expected = IBAN_LENGTHS[compact.slice(0, 2)];
  if (expected === undefined || compact.length !== expected || !/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(compact)) return false;
  return mod97(toDigits(compact.slice(4) + compact.slice(0, 4))) === 1;
};
