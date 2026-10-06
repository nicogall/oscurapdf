import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { ChunkIndex } from '../../../src/contexts/detection/infrastructure/chunk-index';
import { chunkedFetch } from '../../../src/contexts/detection/infrastructure/chunked-fetch';

const BASE = '/oscurapdf/models/';
const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const keyOf = (input: RequestInfo | URL): string => (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);

/** A fake static host serving the files given; records every request. */
const host = (files: Record<string, Uint8Array<ArrayBuffer> | string>) => {
  const requests: string[] = [];
  const fetchImpl = ((input: RequestInfo | URL) => {
    const url = keyOf(input);
    requests.push(url);
    const body = files[url];
    return Promise.resolve(body === undefined ? new Response(null, { status: 404 }) : new Response(body));
  }) as typeof fetch;
  return { fetchImpl, requests };
};

const partA = new Uint8Array([1, 2, 3]);
const partB = new Uint8Array([4, 5]);
const index: ChunkIndex = {
  files: {
    'org/model/onnx/model.onnx': {
      size: 5,
      parts: [
        { name: 'model.onnx.part000', size: 3, sha256: sha(partA) },
        { name: 'model.onnx.part001', size: 2, sha256: sha(partB) },
      ],
    },
  },
};

describe('chunkedFetch', () => {
  it('reassembles a split model file from its verified parts', async () => {
    const { fetchImpl, requests } = host({
      [`${BASE}chunks.json`]: JSON.stringify(index),
      [`${BASE}org/model/onnx/model.onnx.part000`]: partA,
      [`${BASE}org/model/onnx/model.onnx.part001`]: partB,
    });
    const response = await chunkedFetch(fetchImpl, BASE)(`${BASE}org/model/onnx/model.onnx`);
    expect(response.headers.get('content-length')).toBe('5');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3, 4, 5]);
    expect(requests.filter((r) => r.endsWith('chunks.json'))).toHaveLength(1);
  });

  it('refuses a part whose content does not match its checksum', async () => {
    const { fetchImpl } = host({
      [`${BASE}chunks.json`]: JSON.stringify(index),
      [`${BASE}org/model/onnx/model.onnx.part000`]: new Uint8Array([9, 9, 9]),
      [`${BASE}org/model/onnx/model.onnx.part001`]: partB,
    });
    const response = await chunkedFetch(fetchImpl, BASE)(`${BASE}org/model/onnx/model.onnx`);
    await expect(response.arrayBuffer()).rejects.toThrow(/checksum/);
  });

  it('fails clearly when a part is missing', async () => {
    const { fetchImpl } = host({ [`${BASE}chunks.json`]: JSON.stringify(index), [`${BASE}org/model/onnx/model.onnx.part000`]: partA });
    const response = await chunkedFetch(fetchImpl, BASE)(`${BASE}org/model/onnx/model.onnx`);
    await expect(response.arrayBuffer()).rejects.toThrow(/HTTP 404/);
  });

  it('passes through files that were not split, other URLs, and works without an index (dev server)', async () => {
    const { fetchImpl } = host({ [`${BASE}org/model/config.json`]: '{"a":1}', '/other.js': 'x' });
    const fetchModel = chunkedFetch(fetchImpl, BASE);
    expect(await (await fetchModel(`${BASE}org/model/config.json`)).text()).toBe('{"a":1}');
    expect((await fetchModel(new URL('http://host/other.js'))).status).toBe(404);
    expect(await (await fetchModel('/other.js')).text()).toBe('x');
  });

  it('accepts Request objects as input', async () => {
    const { fetchImpl } = host({ [`${BASE}chunks.json`]: '{"files":{}}', [`${BASE}a/config.json`]: 'ok' });
    expect((await chunkedFetch(fetchImpl, BASE)(new Request(`http://host${BASE}a/config.json`))).status).toBe(404);
  });

  it('treats an unreachable index as "nothing split"', async () => {
    const failing = ((input: RequestInfo | URL) =>
      keyOf(input).endsWith('chunks.json') ? Promise.reject(new Error('offline')) : Promise.resolve(new Response('ok'))) as typeof fetch;
    expect(await (await chunkedFetch(failing, BASE)(`${BASE}a/config.json`)).text()).toBe('ok');
  });
});

describe('chunkedFetch downloads a few parts at a time', () => {
  it('starts up to PARALLEL_PARTS downloads before the first part is consumed, and keeps the order', async () => {
    const parts = [1, 2, 3, 4, 5].map((n) => new Uint8Array([n]));
    const files: Record<string, Uint8Array<ArrayBuffer> | string> = {
      [`${BASE}chunks.json`]: JSON.stringify({ files: { 'm.bin': { size: 5, parts: parts.map((p, i) => ({ name: `m.bin.part00${String(i)}`, size: 1, sha256: sha(p) })) } } }),
    };
    parts.forEach((p, i) => (files[`${BASE}m.bin.part00${String(i)}`] = p));
    const { fetchImpl, requests } = host(files);
    const response = await chunkedFetch(fetchImpl, BASE)(`${BASE}m.bin`);
    const reader = response.body?.getReader();
    const first = await reader?.read();
    expect([...(first?.value ?? [])]).toEqual([1]);
    expect(requests.filter((r) => r.includes('.part')).length).toBe(3);
    const rest: number[] = [];
    for (let chunk = await reader?.read(); chunk?.done === false; chunk = await reader?.read()) rest.push(...chunk.value);
    expect(rest).toEqual([2, 3, 4, 5]);
  });
});
