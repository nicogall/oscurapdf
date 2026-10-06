import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsoleLogger } from '@app/infrastructure/console-logger';
import { NullLogger } from '@app/infrastructure/null-logger';
import { createLogger } from '@app/infrastructure/create-logger';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Logger adapters', () => {
  it('NullLogger drops everything (production)', () => {
    const spy = vi.spyOn(console, 'info');
    new NullLogger().log({ code: 'documentLoaded', count: 3 });
    expect(spy).not.toHaveBeenCalled();
  });

  it('ConsoleLogger writes only the typed code and numeric fields (development)', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    new ConsoleLogger().log({ code: 'exportCompleted', durationMs: 12, count: 2 });
    expect(spy).toHaveBeenCalledWith('[redactor]', 'exportCompleted', { durationMs: 12, count: 2 });
  });

  it('selects the adapter by build mode', () => {
    expect(createLogger(true)).toBeInstanceOf(NullLogger);
    expect(createLogger(false)).toBeInstanceOf(ConsoleLogger);
  });
});
