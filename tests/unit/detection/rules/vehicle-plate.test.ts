import { describe, expect, it } from 'vitest';
import { vehiclePlateDetector } from '../../../../src/contexts/detection/domain/rules/vehicle-plate';
import { run } from './rule-test-kit';

describe('vehicle plate detector (High)', () => {
  it('finds the current Italian format anywhere, with or without separators', () => {
    expect(run(vehiclePlateDetector, 'Fiat Panda AB123CD e Vespa EF 456 GH, poi ZZ-789-YY.')).toEqual([
      ['AB123CD', 'high'],
      ['EF 456 GH', 'high'],
      ['ZZ-789-YY', 'high'],
    ]);
  });

  it('ignores the same shape in lower case, with excluded letters, or glued to other characters', () => {
    expect(run(vehiclePlateDetector, 'codice ab123cd, IO123QU, XAB123CD, AB123CD9, AB1234CD')).toEqual([]);
  });

  it('finds older, motorcycle and foreign plates after a keyword', () => {
    expect(run(vehiclePlateDetector, 'Targa: MI 123456. Motociclo targato AB 12345, plate number B-MW 1234, targa n. RM A12345')).toEqual([
      ['MI 123456', 'high'],
      ['AB 12345', 'high'],
      ['B-MW 1234', 'high'],
      ['RM A12345', 'high'],
    ]);
  });

  it('stops at the plate when capitals follow it', () => {
    expect(run(vehiclePlateDetector, 'TARGA MI 123456 DEL 1990')).toEqual([['MI 123456', 'high']]);
  });

  it('reports a current-format plate once, also after a keyword', () => {
    expect(run(vehiclePlateDetector, 'veicolo targato AB 123 CD')).toEqual([['AB 123 CD', 'high']]);
  });

  it('needs letters and digits, and a plausible length, after a keyword', () => {
    expect(run(vehiclePlateDetector, 'targa 123456, targa ABCDEF, targa A1, la targa commemorativa')).toEqual([]);
  });
});
