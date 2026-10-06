import { describe, expect, it } from 'vitest';
import { createDetectionInput } from '../../../../src/contexts/detection/domain/detector';
import { titledNameDetector } from '../../../../src/contexts/detection/domain/rules/titled-name';

const found = (text: string) => titledNameDetector.detect(createDetectionInput(text)).map((c) => [text.slice(c.range.start, c.range.end), c.category, c.confidence]);

describe('titled name rule (High)', () => {
  it('a title followed by capitalised words is a person', () => {
    expect(found("Presiede l'avv. Ferrari; il sig. Esposito e la dott.ssa Greco.")).toEqual([
      ['Ferrari', 'PERSON', 'high'],
      ['Esposito', 'PERSON', 'high'],
      ['Greco', 'PERSON', 'high'],
    ]);
    expect(found("Sig.ra BIANCHI GIULIA, Prof. Moretti, Mr John Smith, Il sig. D'Angelo")).toEqual([
      ['BIANCHI GIULIA', 'PERSON', 'high'],
      ['Moretti', 'PERSON', 'high'],
      ['John Smith', 'PERSON', 'high'],
      ["D'Angelo", 'PERSON', 'high'],
    ]);
  });

  it('stops at labels, greetings and company forms, and never crosses a line', () => {
    expect(found('Il sig. Rossi Nome Mario')).toEqual([['Rossi', 'PERSON', 'high']]);
    expect(found('dott. Bianchi SRL')).toEqual([['Bianchi', 'PERSON', 'high']]);
    expect(found('Il sig.\nTabella 3')).toEqual([]);
  });

  it('needs a capitalised word after the title, and a real title', () => {
    expect(found('il dott. che ha visitato')).toEqual([]);
    expect(found('Meeting Room and Signore Bianchi')).toEqual([]);
  });

  it('after two titles, takes the name and never the second title', () => {
    expect(found('Il Sig. Avv. Fabio Esempio, residente')).toEqual([['Fabio Esempio', 'PERSON', 'high']]);
  });

  it('knows "Per.Ind." as a title', () => {
    expect(found('Il Sig. Per.Ind. Anna Fittizio, nata')).toEqual([['Anna Fittizio', 'PERSON', 'high']]);
  });
});
