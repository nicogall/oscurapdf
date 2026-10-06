// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { BrowserDownloadSink, redactedFileName } from '@app/infrastructure/browser-download-sink';
import { ObjectUrls } from '@app/infrastructure/object-urls';

describe('redactedFileName', () => {
  it('derives "<original-stem>-redacted.pdf" locally', () => {
    expect(redactedFileName('contract.pdf')).toBe('contract-redacted.pdf');
    expect(redactedFileName('Contract.PDF')).toBe('Contract-redacted.pdf');
    expect(redactedFileName('archive.v2.pdf')).toBe('archive.v2-redacted.pdf');
    expect(redactedFileName('no-extension')).toBe('no-extension-redacted.pdf');
  });
});

describe('BrowserDownloadSink', () => {
  it('offers the bytes as a download and revokes the object URL afterwards', () => {
    vi.useFakeTimers();
    const revoked: string[] = [];
    const urls = new ObjectUrls({ createObjectURL: () => 'blob:output', revokeObjectURL: (u) => revoked.push(u) });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    new BrowserDownloadSink(urls).save(new Uint8Array([1, 2, 3]), 'contract-redacted.pdf');
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(revoked).toEqual(['blob:output']);
    vi.useRealTimers();
  });
});
