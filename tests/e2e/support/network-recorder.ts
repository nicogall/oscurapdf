import type { Page, Request } from '@playwright/test';

export interface RecordedRequest {
  readonly method: string;
  readonly url: string;
  readonly bodyBytes: number;
  readonly sameOrigin: boolean;
}

/** Records every request the page makes, for the privacy assertions (SC-004). */
export class NetworkRecorder {
  readonly requests: RecordedRequest[] = [];

  constructor(
    private readonly page: Page,
    private readonly origin: string,
  ) {}

  start(): void {
    this.page.context().on('request', (request) => {
      this.requests.push(this.describe(request));
    });
  }

  /** Requests that are not same-origin static GETs without a body. */
  violations(): RecordedRequest[] {
    return this.requests.filter(
      (r) => !r.url.startsWith('data:') && !r.url.startsWith('blob:') && (!r.sameOrigin || r.method !== 'GET' || r.bodyBytes > 0),
    );
  }

  urlsContaining(secrets: readonly string[]): string[] {
    const lowered = secrets.map((s) => s.toLowerCase());
    return this.requests.map((r) => decodeURIComponent(r.url).toLowerCase()).filter((url) => lowered.some((s) => url.includes(s)));
  }

  private describe(request: Request): RecordedRequest {
    return {
      method: request.method(),
      url: request.url(),
      bodyBytes: request.postDataBuffer()?.byteLength ?? 0,
      sameOrigin: request.url().startsWith(this.origin),
    };
  }
}
