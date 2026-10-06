/**
 * Cross-origin isolation (needed for multi-threaded WASM inference) normally comes from HTTP
 * headers. Static hosts such as GitHub Pages cannot set them, so the service worker adds them to
 * every response it serves. Same values as the dev/preview server (vite.config.ts).
 */
export const ISOLATION_HEADERS: Readonly<Record<string, string>> = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/** The same response with the isolation headers added (opaque responses cannot be changed). */
export const withIsolationHeaders = (response: Response): Response => {
  if (response.type === 'opaque' || response.status === 0) return response;
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(ISOLATION_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

/** Workbox plugin: applied to every response a strategy hands back to the page. */
export const isolationPlugin = {
  handlerWillRespond: ({ response }: { response: Response }): Promise<Response> => Promise.resolve(withIsolationHeaders(response)),
};
