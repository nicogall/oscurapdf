import type { FileSink } from '../ports/file-sink';
import type { ObjectUrls } from './object-urls';

/** "<original-stem>-redacted.pdf", derived locally and never sent anywhere. */
export const redactedFileName = (original: string): string => {
  const stem = original.replace(/\.pdf$/i, '');
  return `${stem}-redacted.pdf`;
};

/** Saves via a temporary download link; the object URL is revoked right after (FR-031). */
export class BrowserDownloadSink implements FileSink {
  constructor(private readonly urls: ObjectUrls) {}

  save(bytes: Uint8Array, fileName: string): void {
    const url = this.urls.create(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => {
      this.urls.revoke(url);
    }, 0);
  }
}
