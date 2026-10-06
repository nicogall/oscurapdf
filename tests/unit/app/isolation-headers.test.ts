import { describe, expect, it } from 'vitest';
import { isolationPlugin, withIsolationHeaders } from '../../../src/service-worker/isolation-headers';

describe('isolation headers added by the service worker', () => {
  it('adds COOP, COEP and CORP and keeps status, headers and body', async () => {
    const original = new Response('body', { status: 200, statusText: 'OK', headers: { 'Content-Type': 'text/html' } });
    const response = await isolationPlugin.handlerWillRespond({ response: original });
    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(response.headers.get('Cross-Origin-Embedder-Policy')).toBe('credentialless');
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
    expect(response.headers.get('Content-Type')).toBe('text/html');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('body');
  });

  it('leaves responses it cannot change untouched', () => {
    const opaque = { type: 'opaque', status: 0 } as Response;
    expect(withIsolationHeaders(opaque)).toBe(opaque);
  });
});
