import { expect, test } from '@playwright/test';
import { waitForDetection } from './support/detection';
import { openFixture } from './support/drop-file';

/**
 * Static hosts limit file sizes (Cloudflare Pages: 25 MiB): the model and the ONNX runtime are
 * published in parts and reassembled, verified, in the browser. The build itself fails if a file
 * is too large (deploy:check); this checks the browser side.
 */
test.describe('static host with a per-file size limit', () => {
  test.setTimeout(300_000);

  test('model and runtime arrive in verified parts; the whole files are never requested', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'One engine is enough for the network shape.');
    const requests: string[] = [];
    page.on('request', (request) => requests.push(new URL(request.url()).pathname));
    await page.goto('/');
    await openFixture(page, 'pii-sampler.pdf');
    await waitForDetection(page);
    await expect(page.getByText(/suggerimenti trovati/)).toBeVisible();
    expect(requests.some((path) => /model_quantized\.onnx\.part000$/u.test(path))).toBe(true);
    expect(requests.some((path) => /ort-wasm-simd-threaded\.asyncify\.wasm\.part000$/u.test(path))).toBe(true);
    expect(requests.filter((path) => /\.(onnx|wasm)$/u.test(path) && /model_quantized|ort-wasm/u.test(path))).toEqual([]);
  });

  test('the start page downloads no engine, worker or model until a document is chosen', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'One engine is enough for the network shape.');
    const requests: string[] = [];
    page.on('request', (request) => requests.push(new URL(request.url()).pathname));
    await page.goto('/');
    await expect(page.getByText('Trascina qui il tuo PDF')).toBeVisible();
    // Give the service worker time to install: it must precache only the start page.
    await page.waitForTimeout(3000);
    const heavy = /\.wasm|\.worker-|pdf\.worker|\/models\/|\/ort\/|\.part\d+$/u;
    expect(requests.filter((path) => heavy.test(path))).toEqual([]);
    await openFixture(page, 'pii-sampler.pdf');
    await waitForDetection(page);
    expect(requests.some((path) => heavy.test(path))).toBe(true);
  });
});
