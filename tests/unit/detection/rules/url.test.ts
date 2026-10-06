import { describe, expect, it } from 'vitest';
import { urlDetector } from '../../../../src/contexts/detection/domain/rules/url';
import { run } from './rule-test-kit';

describe('url detector (High)', () => {
  it('finds links with a scheme or "www", with their path and original casing', () => {
    expect(run(urlDetector, 'See https://www.Example.com/it/profilo?id=7 or WWW.example.museum today.')).toEqual([
      ['https://www.Example.com/it/profilo?id=7', 'high'],
      ['WWW.example.museum', 'high'],
    ]);
  });

  it('finds bare domains with a common top-level domain', () => {
    expect(run(urlDetector, 'Visita esempio.it, shop.example.co.uk/offerte e example.org.')).toEqual([
      ['esempio.it', 'high'],
      ['shop.example.co.uk/offerte', 'high'],
      ['example.org', 'high'],
    ]);
  });

  it('leaves the closing punctuation out', () => {
    expect(run(urlDetector, '(vedi https://example.com/a.html). Poi www.example.it!')).toEqual([
      ['https://example.com/a.html', 'high'],
      ['www.example.it', 'high'],
    ]);
  });

  it('never takes a part of an email address', () => {
    expect(run(urlDetector, 'Scrivi a mario.rossi@example.com o a info.it@example.org')).toEqual([]);
  });

  it('ignores file names, abbreviations, numbers and sentences glued by a full stop', () => {
    expect(run(urlDetector, 'Allegato report.pdf, Alfa S.p.A., art.13, 12.50 euro, v.2.1. Fine.It follows. Come da nota.In caso')).toEqual([]);
  });

  it('keeps a bare domain written in capitals', () => {
    expect(run(urlDetector, 'SITO: ESEMPIO.IT')).toEqual([['ESEMPIO.IT', 'high']]);
  });
});
