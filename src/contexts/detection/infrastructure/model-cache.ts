/**
 * Cache Storage for model files, plugged into Transformers.js as `env.customCache`. It stores the
 * complete body with clean headers: a copied `content-encoding: gzip` header on a decoded body made
 * large models fail to cache, which broke offline detection (FR-029).
 */
export class ModelCache {
  constructor(private readonly open: () => Promise<Cache>) {}

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    return (await this.open()).match(request);
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    const body = await response.arrayBuffer();
    const headers = { 'content-type': 'application/octet-stream', 'content-length': String(body.byteLength) };
    await (await this.open()).put(request, new Response(body, { headers }));
  }
}

const urlOf = (input: RequestInfo | URL): string => (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);

/**
 * Cache-first fetch for model files, installed as Transformers.js `env.fetch`. The large `.onnx`
 * files are loaded through `env.fetch` without consulting any cache, so this is what keeps them
 * available offline after the first download (FR-029).
 */
export const cachedModelFetch =
  (cache: ModelCache, fetchImpl: typeof fetch = fetch): typeof fetch =>
  async (input, init) => {
    const url = urlOf(input);
    if (!url.includes('/models/')) return fetchImpl(input, init);
    const hit = await cache.match(url);
    if (hit !== undefined) return hit;
    const response = await fetchImpl(input, init);
    if (!response.ok) return response;
    // Stored in parallel, not before returning: the caller reads the body as it arrives, so the
    // download progress is visible (awaiting the copy first made it jump from 0 to 100% at the end).
    cache.put(url, response.clone()).catch(() => {
      // Storage refused (e.g. quota or a size limit): the model still loads, it is just not kept offline.
    });
    return response;
  };
