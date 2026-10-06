const PATTERN = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

const ODD_VALUES: Readonly<Record<string, number>> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};

const evenValue = (c: string): number => (c >= '0' && c <= '9' ? Number(c) : c.charCodeAt(0) - 65);

/** Italian tax code: pattern (including omocodia letters) and check character. */
export const isValidCodiceFiscale = (code: string): boolean => {
  const upper = code.toUpperCase();
  if (!PATTERN.test(upper)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const c = upper.charAt(i);
    sum += i % 2 === 0 ? (ODD_VALUES[c] ?? 0) : evenValue(c);
  }
  return String.fromCharCode(65 + (sum % 26)) === upper.charAt(15);
};
