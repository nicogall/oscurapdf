import { CHUNK_INDEX, type ChunkIndex, type ChunkPart } from './chunk-index';

const urlOf = (input: RequestInfo | URL): string => (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);

const hex = (digest: ArrayBuffer): string => [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** The index, or an empty one when nothing was split (dev server, Node). */
const loadIndex = async (fetchImpl: typeof fetch, base: string): Promise<ChunkIndex> => {
  try {
    const response = await fetchImpl(`${base}${CHUNK_INDEX}`);
    return response.ok ? ((await response.json()) as ChunkIndex) : { files: {} };
  } catch {
    return { files: {} };
  }
};

/** Parts downloaded at the same time (several connections use the bandwidth better; ≤ 24 MB in flight). */
export const PARALLEL_PARTS = 3;

/** One part, checked against its SHA-256 before it is used. */
const fetchPart = async (fetchImpl: typeof fetch, folder: string, part: ChunkPart): Promise<Uint8Array> => {
  const response = await fetchImpl(`${folder}${part.name}`);
  if (!response.ok) throw new Error(`part ${part.name}: HTTP ${String(response.status)}`);
  const bytes = await response.arrayBuffer();
  if (hex(await crypto.subtle.digest('SHA-256', bytes)) !== part.sha256) throw new Error(`part ${part.name}: checksum mismatch`);
  return new Uint8Array(bytes);
};

/** Streams the parts in order, downloading a few ahead; each is verified before it is passed on. */
const reassemble = (fetchImpl: typeof fetch, folder: string, parts: readonly ChunkPart[]): ReadableStream<Uint8Array> => {
  const downloads: Array<Promise<Uint8Array>> = [];
  const startUpTo = (end: number): void => {
    for (let i = downloads.length; i < Math.min(end, parts.length); i++) {
      const download = fetchPart(fetchImpl, folder, parts[i] as ChunkPart);
      // Handled when its turn comes; until then a failure must not be reported as unhandled.
      download.catch(() => undefined);
      downloads.push(download);
    }
  };
  let next = 0;
  return new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      if (next >= parts.length) {
        controller.close();
        return;
      }
      startUpTo(next + PARALLEL_PARTS);
      controller.enqueue(await (downloads[next++] as Promise<Uint8Array>));
    },
  });
};

/**
 * `fetch` for files under `base` (models, ONNX runtime) that may have been split into parts at
 * build time, because static hosts limit file sizes: a split file is fetched part by part,
 * verified and served as one response, so its consumers and the offline cache see the original.
 */
export const chunkedFetch = (fetchImpl: typeof fetch, base: string): typeof fetch => {
  let index: Promise<ChunkIndex> | undefined;
  return async (input, init) => {
    const url = urlOf(input);
    const at = url.indexOf(base);
    if (at === -1) return fetchImpl(input, init);
    index ??= loadIndex(fetchImpl, url.slice(0, at + base.length));
    const entry = (await index).files[url.slice(at + base.length)];
    if (entry === undefined) return fetchImpl(input, init);
    const folder = url.slice(0, url.lastIndexOf('/') + 1);
    const headers = { 'content-type': 'application/octet-stream', 'content-length': String(entry.size) };
    return new Response(reassemble(fetchImpl, folder, entry.parts), { status: 200, headers });
  };
};
