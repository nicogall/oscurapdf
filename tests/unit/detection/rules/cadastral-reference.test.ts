import { describe, expect, it } from 'vitest';
import { cadastralReferenceDetector } from '../../../../src/contexts/detection/domain/rules/cadastral-reference';
import { run } from './rule-test-kit';

describe('cadastral reference detector (High)', () => {
  it('takes sheet and parcel, with the unit when present', () => {
    expect(run(cadastralReferenceDetector, "l'immobile con Foglio 304, particella 3567 e il terreno con foglio 12 mappale 45, sub. 3.")).toEqual([
      ['Foglio 304, particella 3567', 'high'],
      ['foglio 12 mappale 45, sub. 3', 'high'],
    ]);
  });

  it('understands abbreviations and "n."', () => {
    expect(run(cadastralReferenceDetector, 'censito al Foglio n. 7, p.lla 120A, subalterno 2')).toEqual([['Foglio n. 7, p.lla 120A, subalterno 2', 'high']]);
  });

  it('ignores a sheet without a parcel', () => {
    expect(run(cadastralReferenceDetector, 'vedi foglio 3 allegato, particella mancante')).toEqual([]);
  });
});
