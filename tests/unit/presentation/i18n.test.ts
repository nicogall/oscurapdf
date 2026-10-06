import { describe, expect, it } from 'vitest';
import { en } from '../../../src/presentation/i18n/en';
import { it as italian } from '../../../src/presentation/i18n/it';
import { createI18n, detectDefaultLanguage, initialLanguage, startLanguage, UI_LANGUAGES } from '../../../src/presentation/i18n/i18n';

const keysOf = (tree: object, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keysOf(value as object, `${prefix}${key}.`),
  );

describe('i18n resources', () => {
  it('EN and IT have exactly the same keys', () => {
    expect(keysOf(italian).sort()).toEqual(keysOf(en).sort());
  });

  it('no translation is empty', () => {
    const values = (tree: object): string[] =>
      Object.values(tree).flatMap((v) => (typeof v === 'string' ? [v] : values(v as object)));
    for (const v of [...values(en), ...values(italian)]) expect(v.trim().length).toBeGreaterThan(0);
  });
});

describe('language selection (FR-033)', () => {
  it('defaults to Italian only for Italian browsers, otherwise English', () => {
    expect(detectDefaultLanguage(['it-IT', 'en-US'])).toBe('it');
    expect(detectDefaultLanguage(['it'])).toBe('it');
    expect(detectDefaultLanguage(['de-DE', 'it-IT'])).toBe('en');
    expect(detectDefaultLanguage(['fr-FR'])).toBe('en');
    expect(detectDefaultLanguage([])).toBe('en');
  });

  it('a stored preference wins over the browser language', () => {
    expect(initialLanguage('en', ['it-IT'])).toBe('en');
    expect(initialLanguage(undefined, ['it-IT'])).toBe('it');
  });

  it('the UI is Italian only for now, whatever the browser or stored preference (2026-10-01)', () => {
    expect(UI_LANGUAGES).toEqual(['it']);
    expect(startLanguage(UI_LANGUAGES, 'en', ['en-US'])).toBe('it');
    expect(startLanguage(UI_LANGUAGES, undefined, ['de-DE'])).toBe('it');
  });

  it('with several languages offered, preference then browser language decide', () => {
    expect(startLanguage(['en', 'it'], 'en', ['it-IT'])).toBe('en');
    expect(startLanguage(['en', 'it'], undefined, ['it-IT'])).toBe('it');
    expect(startLanguage(['en', 'it'], undefined, ['fr-FR'])).toBe('en');
    expect(startLanguage([], undefined, ['it-IT'])).toBe('it');
  });

  it('translates in both languages', async () => {
    const i18n = await createI18n('it');
    expect(i18n.t('app.privacy')).toBe(italian.app.privacy);
    await i18n.changeLanguage('en');
    expect(i18n.t('app.privacy')).toBe(en.app.privacy);
  });
});
