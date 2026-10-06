export interface UrlApi {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
}

/** Tracks every object URL the app creates so all can be revoked on close (FR-031). */
export class ObjectUrls {
  private readonly urls = new Set<string>();

  constructor(private readonly api: UrlApi = URL) {}

  create(blob: Blob): string {
    const url = this.api.createObjectURL(blob);
    this.urls.add(url);
    return url;
  }

  revoke(url: string): void {
    if (this.urls.delete(url)) this.api.revokeObjectURL(url);
  }

  revokeAll(): void {
    for (const url of [...this.urls]) this.revoke(url);
  }
}
