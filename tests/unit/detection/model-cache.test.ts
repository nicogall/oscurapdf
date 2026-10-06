import { describe, expect, it } from 'vitest';
import { ModelCache, cachedModelFetch } from '../../../src/contexts/detection/infrastructure/model-cache';

const keyOf = (request: RequestInfo | URL): string =>
  typeof request === 'string' ? request : request instanceof URL ? request.href : request.url;

const fakeCache = () => {
  const entries = new Map<string, Response>();
  const cache = {
    // Like the real Cache API, every match returns a fresh Response.
    match: (request: RequestInfo | URL) => Promise.resolve(entries.get(keyOf(request))?.clone()),
    put: (request: RequestInfo | URL, response: Response) => {
      entries.set(keyOf(request), response);
      return Promise.resolve();
    },
  } as unknown as Cache;
  return { cache, entries };
};

const bytes = async (response: Response | undefined): Promise<number[]> => [...new Uint8Array(await (response ?? new Response()).arrayBuffer())];

describe('ModelCache', () => {
  it('stores the complete body with clean headers (no content-encoding) and serves it back', async () => {
    const { cache, entries } = fakeCache();
    const modelCache = new ModelCache(() => Promise.resolve(cache));
    const gzipLabelled = new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-encoding': 'gzip', 'content-length': '999' } });
    await modelCache.put('/models/a.onnx', gzipLabelled);
    const stored = entries.get('/models/a.onnx');
    expect(stored?.headers.get('content-encoding')).toBeNull();
    expect(stored?.headers.get('content-length')).toBe('3');
    expect(await bytes(await modelCache.match('/models/a.onnx'))).toEqual([1, 2, 3]);
    expect(await modelCache.match('/models/missing.onnx')).toBeUndefined();
  });
});

describe('cachedModelFetch', () => {
  const network = () => {
    const calls: string[] = [];
    const fetchImpl = (input: RequestInfo | URL) => {
      calls.push(keyOf(input));
      return Promise.resolve(new Response(new Uint8Array([7, 8]), { status: keyOf(input).includes('missing') ? 404 : 200 }));
    };
    return { calls, fetchImpl };
  };

  it('serves model files from the cache first, downloads and stores them otherwise', async () => {
    const { cache } = fakeCache();
    const { calls, fetchImpl } = network();
    const cachedFetch = cachedModelFetch(new ModelCache(() => Promise.resolve(cache)), fetchImpl);
    expect(await bytes(await cachedFetch('http://x/models/m.onnx'))).toEqual([7, 8]);
    expect(await bytes(await cachedFetch(new URL('http://x/models/m.onnx')))).toEqual([7, 8]);
    expect(await bytes(await cachedFetch(new Request('http://x/models/m.onnx')))).toEqual([7, 8]);
    expect(calls).toEqual(['http://x/models/m.onnx']);
  });

  it('passes other requests and failed downloads straight through without caching', async () => {
    const { cache, entries } = fakeCache();
    const { fetchImpl } = network();
    const cachedFetch = cachedModelFetch(new ModelCache(() => Promise.resolve(cache)), fetchImpl);
    expect((await cachedFetch('http://x/other.json')).status).toBe(200);
    expect((await cachedFetch('http://x/models/missing.onnx')).status).toBe(404);
    expect(entries.size).toBe(0);
  });
});

describe('cachedModelFetch when storage fails', () => {
  it('still returns the downloaded model if the cache refuses to store it', async () => {
    const refusing = { match: () => Promise.resolve(undefined), put: () => Promise.reject(new Error('UnknownError')) } as unknown as Cache;
    const fetchImpl = () => Promise.resolve(new Response(new Uint8Array([1])));
    const response = await cachedModelFetch(new ModelCache(() => Promise.resolve(refusing)), fetchImpl)('http://x/models/big.onnx');
    expect(response.ok).toBe(true);
  });
});
