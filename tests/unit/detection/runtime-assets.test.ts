import { describe, expect, it } from 'vitest';
import { loadOnnxRuntime, loadRuntimeAsBlobUrls } from '../../../src/contexts/detection/infrastructure/runtime-assets';

describe('loadRuntimeAsBlobUrls', () => {
  it('fetches the glue and binary once and returns blob URLs', async () => {
    const requested: string[] = [];
    const fetchImpl = (input: RequestInfo | URL) => {
      requested.push(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      return Promise.resolve(new Response('x'));
    };
    const urls = await loadRuntimeAsBlobUrls('/ort/', 'ort-wasm-simd-threaded.asyncify', fetchImpl);
    expect(requested).toEqual(['/ort/ort-wasm-simd-threaded.asyncify.mjs', '/ort/ort-wasm-simd-threaded.asyncify.wasm']);
    expect(urls.mjs.startsWith('blob:')).toBe(true);
    expect(urls.wasm.startsWith('blob:')).toBe(true);
  });

  it('fails loudly when an asset is missing', async () => {
    const fetchImpl = () => Promise.resolve(new Response('', { status: 404 }));
    await expect(loadRuntimeAsBlobUrls('/ort/', 'x', fetchImpl as typeof fetch)).rejects.toThrow('HTTP 404');
  });

  it('loadOnnxRuntime takes the app runtime from <base>ort/', async () => {
    const requested: string[] = [];
    const fetchImpl = ((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      requested.push(url);
      return Promise.resolve(url.endsWith('chunks.json') ? new Response('{"files":{}}') : new Response('x'));
    }) as typeof fetch;
    const urls = await loadOnnxRuntime('/oscurapdf/', fetchImpl);
    expect(requested).toEqual(expect.arrayContaining(['/oscurapdf/ort/ort-wasm-simd-threaded.asyncify.mjs', '/oscurapdf/ort/ort-wasm-simd-threaded.asyncify.wasm']));
    expect(urls.wasm.startsWith('blob:')).toBe(true);
  });
});
