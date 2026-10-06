import { describe, expect, it } from 'vitest';
import { detectionMode, WASM_MODEL, WITH_MODEL } from '../../../src/workers/detection-mode';

describe('detection mode', () => {
  it('a computer may run the model on the GPU', () => {
    expect(detectionMode(false)).toBe(WITH_MODEL);
  });

  it('a phone or tablet runs the model on WASM only', () => {
    expect(detectionMode(true)).toBe(WASM_MODEL);
  });
});
