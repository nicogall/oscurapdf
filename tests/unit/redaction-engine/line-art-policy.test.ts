import { describe, expect, it } from 'vitest';
import { attachmentDecision, lineArtModeFor, scrubValue } from '@engine';

describe('line-art policy (research R1)', () => {
  it('text → fully covered, area → touched', () => {
    expect(lineArtModeFor('text')).toBe('removeIfCovered');
    expect(lineArtModeFor('area')).toBe('removeIfTouched');
  });
});

describe('side-channel policy (FR-021, clarification Q2)', () => {
  it('deletes whole-word, case-insensitive matches and counts them', () => {
    expect(scrubValue('Record of Mario Rossi and MARIO ROSSI', ['mario rossi'])).toEqual({ value: 'Record of  and ', removed: 2 });
  });

  it('keeps values without redacted text unchanged', () => {
    expect(scrubValue('Synthetic Fixture Producer', ['mario rossi'])).toEqual({ value: 'Synthetic Fixture Producer', removed: 0 });
  });

  it('does not delete partial words', () => {
    expect(scrubValue('Rossini', ['rossi'])).toEqual({ value: 'Rossini', removed: 0 });
  });

  it('handles several redacted texts, including overlapping ones', () => {
    expect(scrubValue('Mario Rossi, Milano', ['mario rossi', 'rossi', 'milano']).value).toBe(', ');
  });

  it('matches across line breaks and extra spaces', () => {
    expect(scrubValue('Mario\n  Rossi', ['mario rossi']).removed).toBe(1);
  });

  it('removes attachments whose name or content contains redacted text', () => {
    expect(attachmentDecision('notes.txt', 'Notes about Mario Rossi.', ['mario rossi'])).toBe('remove');
    expect(attachmentDecision('mario-rossi.txt', '', ['mario rossi'])).toBe('keep');
    expect(attachmentDecision('Mario Rossi.txt', '', ['mario rossi'])).toBe('remove');
    expect(attachmentDecision('report.txt', 'nothing sensitive', ['mario rossi'])).toBe('keep');
  });
});
