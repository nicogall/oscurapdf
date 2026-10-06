import { describe, expect, it } from 'vitest';
import { toModelCasing } from '../../../src/contexts/detection/infrastructure/model-casing';

describe('model casing', () => {
  it('shows capitalised words to the model in title case, keeping every offset', () => {
    const text = "COGNOME: ROSSI NOME: MARIO, D'ANGELO e Bianchi; IBAN e A1";
    const cased = toModelCasing(text);
    expect(cased).toBe("Cognome: Rossi Nome: Mario, D'Angelo e Bianchi; Iban e A1");
    expect(cased).toHaveLength(text.length);
  });

  it('leaves a word alone when lower-casing would change its length', () => {
    expect(toModelCasing('KİLİM')).toBe('KİLİM');
  });
});
