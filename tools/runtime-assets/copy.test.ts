import { describe, expect, it } from 'vitest';
import { isRuntimeAsset } from './copy';

describe('runtime assets', () => {
  it('ships only the ONNX Runtime variant the app loads (asyncify: WASM and WebGPU)', () => {
    expect(isRuntimeAsset('ort-wasm-simd-threaded.asyncify.wasm')).toBe(true);
    expect(isRuntimeAsset('ort-wasm-simd-threaded.asyncify.mjs')).toBe(true);
    expect(isRuntimeAsset('ort-wasm-simd-threaded.jsep.wasm')).toBe(false);
    expect(isRuntimeAsset('ort-wasm-simd-threaded.mjs')).toBe(false);
    expect(isRuntimeAsset('ort.all.min.mjs')).toBe(false);
    expect(isRuntimeAsset('ort-wasm-simd-threaded.asyncify.wasm.map')).toBe(false);
  });
});
