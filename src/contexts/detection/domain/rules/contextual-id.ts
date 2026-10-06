import type { Detector } from '../detector';
import { candidateAt } from './pattern-match';

/** Words that announce an identifier of a person, a customer, a document or a contract (IT + EN). */
const KEYWORDS = [
  'patient (?:number|id|no\\.?)', 'n\\. ?pratica', 'pratica n\\.?', 'fascicolo', 'case (?:no\\.?|number)', 'file (?:no\\.?|number)',
  'contract (?:#|no\\.?|number)', 'contratto n\\.?', 'n\\. ?contratto', 'codice contratto',
  'codice cliente', 'cod\\. ?cliente', 'n\\. ?cliente', 'numero cliente', 'id cliente', 'customer (?:id|number|no\\.?)', 'client (?:id|number|no\\.?)',
  'codice utente', 'id utente', 'user id', 'codice utenza', 'n\\. ?utenza', 'pod', 'pdr',
  'matricola', 'account (?:no\\.?|number)', 'numero di conto', 'codice identificativo',
  'n\\. ?documento', 'numero documento', 'document (?:no\\.?|number)',
  'fattura n\\.?', 'n\\. ?fattura', 'numero fattura', 'invoice (?:#|no\\.?|number)',
  'ordine n\\.?', 'n\\. ?ordine', 'numero ordine', 'order (?:#|no\\.?|number)',
  'protocollo(?: n\\.?)?', 'prot\\. ?(?:n\\.?)?', 'polizza n\\.?', 'n\\. ?polizza', 'numero polizza', 'policy (?:no\\.?|number)',
  'tessera sanitaria(?: n\\.?)?', 'tessera n\\.?', 'n\\. ?tessera', 'numero tessera', 'membership (?:no\\.?|number)', 'n\\. ?iscrizione',
  'rif\\.', 'riferimento', 'ref\\.', 'reference (?:no\\.?|number)',
  // Acts and procedures of courts, offices and tenders (2026-10-04). Laws and decrees ("legge n. 241/1990") are not identifiers.
  'istanza n\\.?', 'determina(?:zione)? n\\.?', 'delibera(?:zione)? n\\.?', 'ordinanza n\\.?', 'sentenza n\\.?', 'verbale n\\.?', 'gara n\\.?',
  'appalto n\\.?', 'assegno n\\.?', 'fideiussione n\\.?', 'concessione n\\.?', 'autorizzazione n\\.?', 'licenza n\\.?', 'mandato n\\.?',
  'rep\\.(?: n\\.?)?', 'repertorio(?: n\\.?)?', 'racc\\.(?: n\\.?)?', 'raccolta n\\.?', 'r\\.?g\\.?(?: n\\.?)?', 'ruolo generale(?: n\\.?)?', 'cig', 'cup',
  'ddt(?: n\\.?)?', 'causa n\\.?', 'giudizio n\\.?', 'reclamo n\\.?', 'rapporto n\\.?',
  'patente(?: di guida)?(?: n\\.?)?', 'passaporto n\\.?', "documento d'identit[aà]'? n\\.?", "carta d'identit[aà]'? n\\.?",
];

/**
 * The identifier, taken whole: digit groups split by single spaces ("123123123 1", allowed only
 * here, after a keyword), or one id-shaped token ("2024/17-B").
 */
const TOKEN = '(\\d+(?: \\d+){1,5}(?![\\p{L}\\p{N}])|[a-z0-9][a-z0-9/_-]*\\d[a-z0-9/_-]*)';
/** Beyond this, a run of digit groups is not one identifier. */
const MAX_DIGITS = 20;
const CONTEXTUAL = new RegExp(`(?<![\\p{L}])(?:${KEYWORDS.join('|')})(?![\\p{L}])\\s*[:#]?\\s*${TOKEN}`, 'dgu');

/**
 * An identifier announced by a keyword ("codice cliente: 12313123123", "Pratica n. 2024/17-B"):
 * the keyword says it identifies someone, so it is High. The candidate covers the identifier only.
 */
export const contextualIdDetector: Detector = {
  name: 'contextual-id',
  detect: (input) =>
    [...input.normalized.normalized.matchAll(CONTEXTUAL)].flatMap((m) => {
      const token = m.indices?.[1];
      if (token === undefined || (m[1] ?? '').replace(/\D/g, '').length > MAX_DIGITS) return [];
      return candidateAt(input, { start: token[0], end: token[1] }, 'CONTEXTUAL_ID', 'high');
    }),
};
