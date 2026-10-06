import { describe, expect, it } from 'vitest';
import { isUnreadableLine, separateUnreadable } from '../../../src/contexts/document-ingestion/domain/text-legibility';
import type { PageText } from '../../../src/contexts/document-ingestion/domain/page-text';

const lineOf = (text: string, y = 0) => ({ chars: Array.from(text).map((char, i) => ({ char, box: { x: i * 5, y, width: 5, height: 10 } })) });

describe('unreadable text (FR-037: broken character map)', () => {
  it('Italian text, codes, e-mails and amounts are readable', () => {
    for (const line of [
      'Il sottoscritto Mario Esempio, nato a Roma il 12/03/1980',
      'Codice fiscale: RSSMRA80C12Z999I — IBAN IT60X0542811101000000123456',
      'Email: mario.esempio@example.it · Tel. +39 06 1234 5678',
      'Totale € 1.250,00 (IVA 22%) «saldo» n° 4/B',
      'Perché è già così? Sì, Città – Università ﬁne',
    ]) {
      expect(isUnreadableLine(line), line).toBe(false);
    }
  });

  it('a few symbols or an icon do not make a line unreadable', () => {
    expect(isUnreadableLine(' mario.esempio@example.it')).toBe(false);
    expect(isUnreadableLine('α = 0,5 → vedi tabella')).toBe(false);
    expect(isUnreadableLine('')).toBe(false);
  });

  it('control codes, private-use characters and unrelated symbols are unreadable', () => {
    expect(isUnreadableLine('\u0003\u0011\u0012\u0005\u0003\u0014\u0016')).toBe(true);
    expect(isUnreadableLine('@.')).toBe(true);
    expect(isUnreadableLine('ÿ¬Œ¦¤ƒ¨¯×¸')).toBe(true);
    expect(isUnreadableLine('Ѐ҂ӕԖ@ՙ֏.ؠ')).toBe(true);
    expect(isUnreadableLine('����')).toBe(true);
  });

  it('separates unreadable lines: they leave the text and become zones on their page', () => {
    const pages: PageText[] = [
      { page: 0, lines: [lineOf('Oggetto: contratto', 0), lineOf('\u0003\u0011\u0012\u0005\u0014', 20)] },
      { page: 1, lines: [lineOf('Tutto leggibile qui', 0)] },
    ];
    const result = separateUnreadable(pages);
    expect(result.pages[0]?.lines).toHaveLength(1);
    expect(result.pages[1]?.lines).toHaveLength(1);
    expect(result.unreadable.pages).toEqual([0]);
    expect(result.unreadable.zones).toEqual([{ page: 0, box: { x: 0, y: 20, width: 25, height: 10 } }]);
  });

  it('a document without unreadable text is returned unchanged', () => {
    const pages: PageText[] = [{ page: 0, lines: [lineOf('Tutto bene')] }];
    const result = separateUnreadable(pages);
    expect(result.pages).toEqual(pages);
    expect(result.unreadable).toEqual({ pages: [], zones: [] });
  });
});
