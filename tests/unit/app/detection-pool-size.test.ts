import { describe, expect, it } from 'vitest';
import { detectionPoolSize } from '@app/infrastructure/detection-pool-size';

describe('detection pool size (measured 2026-10-01)', () => {
  it('with WASM threads: one 4-thread worker per 4 cores, at most 3', () => {
    expect(detectionPoolSize({ cores: 10, memoryGb: 8, isolated: true, handheld: false })).toBe(2);
    expect(detectionPoolSize({ cores: 4, memoryGb: undefined, isolated: true, handheld: false })).toBe(1);
    expect(detectionPoolSize({ cores: 32, memoryGb: 8, isolated: true, handheld: false })).toBe(3);
  });

  it('without threads (Safari): more single-threaded workers, at most 4', () => {
    expect(detectionPoolSize({ cores: 10, memoryGb: undefined, isolated: false, handheld: false })).toBe(4);
    expect(detectionPoolSize({ cores: 2, memoryGb: undefined, isolated: false, handheld: false })).toBe(1);
  });

  it('a device with little memory gets one worker', () => {
    expect(detectionPoolSize({ cores: 10, memoryGb: 4, isolated: true, handheld: false })).toBe(1);
  });

  it('a phone or tablet gets one worker, however many cores it has', () => {
    expect(detectionPoolSize({ cores: 6, memoryGb: undefined, isolated: false, handheld: true })).toBe(1);
    expect(detectionPoolSize({ cores: 8, memoryGb: 8, isolated: true, handheld: true })).toBe(1);
  });
});
