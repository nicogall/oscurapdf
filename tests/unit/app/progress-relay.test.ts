import { describe, expect, it } from 'vitest';
import { ProgressRelay } from '@app/infrastructure/progress-relay';

describe('ProgressRelay', () => {
  it('forwards progress, gives late listeners the latest value, and stops on request', () => {
    const relay = new ProgressRelay();
    const early: number[] = [];
    const stopEarly = relay.subscribe((f) => early.push(f));
    relay.emit(0.2);
    const late: number[] = [];
    relay.subscribe((f) => late.push(f));
    stopEarly();
    relay.emit(0.6);
    expect(early).toEqual([0.2]);
    expect(late).toEqual([0.2, 0.6]);
  });
});
