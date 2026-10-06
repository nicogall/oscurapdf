import { describe, expect, it } from 'vitest';
import { idDocumentDetector } from '../../../../src/contexts/detection/domain/rules/id-document';
import { run } from './rule-test-kit';

describe('ID document detector (High, context required)', () => {
  it('finds CIE and passport numbers after a keyword', () => {
    expect(run(idDocumentDetector, "Carta d'identità n. CA12345AB. Passport YA1234567.")).toEqual([
      ['CA12345AB', 'high'],
      ['YA1234567', 'high'],
    ]);
  });

  it('ignores the same patterns without context', () => {
    expect(run(idDocumentDetector, 'Order CA12345AB shipped, ref YA1234567.')).toEqual([]);
  });
});
