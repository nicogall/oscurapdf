/** IT + EN context keywords (normalized: lowercase). */
export const PHONE_KEYWORDS = ['tel', 'tel.', 'telefono', 'cellulare', 'cell', 'phone', 'mobile', 'fax'];
export const VAT_KEYWORDS = ['p.iva', 'p. iva', 'partita iva', 'piva', 'iva', 'vat', 'vat number', 'vat no'];
export const IBAN_KEYWORDS = ['iban', 'coordinate bancarie', 'conto corrente', 'c/c', 'bank account'];
export const TAX_CODE_KEYWORDS = ['codice fiscale', 'cod. fiscale', 'cod. fisc.', 'c.f.', 'c.f', 'cf', 'tax code', 'fiscal code'];
export const CARD_KEYWORDS = ['carta', 'carta di credito', 'carta di debito', 'bancomat', 'card', 'credit card', 'debit card'];
export const ID_DOCUMENT_KEYWORDS = [
  "carta d'identità",
  'carta di identità',
  "carta d'identita",
  'documento',
  'passaporto',
  'passport',
  'identity card',
  'id card',
  'c.i.',
  'cie',
];

const DEFAULT_WINDOW = 40;

/** True if a keyword appears (as a word) within `window` characters before `start`. */
export const hasContextBefore = (normalized: string, start: number, keywords: readonly string[], window = DEFAULT_WINDOW): boolean => {
  const before = normalized.slice(Math.max(0, start - window), start);
  return keywords.some((keyword) => new RegExp(`(^|[^\\p{L}\\p{N}])${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(before));
};
