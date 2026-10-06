const escapePattern = (word: string): string => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A case-insensitive spelling without the `i` flag, which would also relax \p{Lu} in the rest. */
export const caseless = (word: string): string =>
  Array.from(word, (c) => (c.toLowerCase() === c.toUpperCase() ? escapePattern(c) : `[${c.toLowerCase()}${c.toUpperCase()}]`)).join('');
