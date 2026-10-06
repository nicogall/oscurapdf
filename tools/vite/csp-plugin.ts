import type { Plugin } from 'vite';

/**
 * Production Content-Security-Policy (research R9). The browser itself blocks any network egress
 * to other origins. Applied to builds only: the dev server needs inline styles and a websocket.
 */
export const PRODUCTION_CSP = [
  "default-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "script-src 'self' 'wasm-unsafe-eval'",
  "img-src 'self' blob: data:",
  "object-src 'none'",
].join('; ');

export const cspPlugin = (): Plugin => ({
  name: 'redactor-csp',
  apply: 'build',
  transformIndexHtml: (html) => ({
    html,
    tags: [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: PRODUCTION_CSP },
        injectTo: 'head-prepend',
      },
    ],
  }),
});
