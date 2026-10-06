/// <reference lib="webworker" />
// Offline service worker (FR-029): precaches the app, caches the ONNX runtime on first use, and adds
// the cross-origin isolation headers that static hosts (GitHub Pages) cannot send. It never sees or
// stores document data: documents are opened from the file picker, not fetched.
import { clientsClaim } from 'workbox-core';
import { addPlugins, cleanupOutdatedCaches, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { isolationPlugin } from './isolation-headers';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<PrecacheEntry | string> };

void self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
addPlugins([isolationPlugin]);
precacheAndRoute(self.__WB_MANIFEST);
/** Only complete, successful runtime files are cached. */
const successfulOnly = {
  cacheWillUpdate: ({ response }: { response: Response }): Promise<Response | null> => Promise.resolve(response.status === 200 ? response : null),
};

/**
 * Same-origin static files: a module worker's script request carries `Origin`, a plain fetch of the
 * same file does not, and `Vary: Origin` would make them miss each other in the cache.
 */
const sameFile = { ignoreVary: true };

registerRoute(
  ({ url }) => url.pathname.includes('/ort/'),
  new CacheFirst({ cacheName: 'onnx-runtime', plugins: [successfulOnly, isolationPlugin], matchOptions: sameFile }),
);

/** Engines loaded only when a document is opened: the workers (PDF.js is inside one) and MuPDF (hashed names). */
const ENGINE = /\/assets\/(?:[^/]*\.worker-[^/]*\.js|[^/]*\.wasm)$/u;

/** Keeps the engines of the current release and the previous one, not every old version. */
const MAX_ENGINE_ENTRIES = 12;
const keepRecent = {
  cacheDidUpdate: async ({ cacheName }: { cacheName: string }): Promise<void> => {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENGINE_ENTRIES)).map((key) => cache.delete(key)));
  },
};

registerRoute(
  ({ url }) => ENGINE.test(url.pathname),
  new CacheFirst({ cacheName: 'app-engines', plugins: [successfulOnly, keepRecent, isolationPlugin], matchOptions: sameFile }),
);
