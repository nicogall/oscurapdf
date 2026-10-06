import { describe, expect, it } from 'vitest';
import { sideChannelCheck } from '@verification';

describe('sideChannelCheck', () => {
  it('passes when no side channel contains redacted text', () => {
    expect(sideChannelCheck([{ channel: 'infoDictionary', text: 'Synthetic Fixture Producer' }], ['mario rossi']).passed).toBe(true);
  });

  it('fails for every channel value that still contains redacted text, without exposing it', () => {
    const check = sideChannelCheck(
      [
        { channel: 'xmp', text: '<dc:creator>Mario Rossi</dc:creator>' },
        { channel: 'attachment', text: 'notes about MARIO ROSSI' },
      ],
      ['mario rossi'],
    );
    expect(check.passed).toBe(false);
    expect(check.failures).toEqual([{ redactionIndex: 0 }, { redactionIndex: 0 }]);
    expect(JSON.stringify(check)).not.toContain('Rossi');
  });
});
