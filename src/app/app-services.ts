import type { Result } from '@shared-kernel';
import type { PageBitmap } from '@ingestion';
import type { DocumentSession } from './document-session';
import type { Logger } from './ports/logger';
import type { PreferenceStore } from './ports/preference-store';

/** Everything the presentation layer may use. Built by the composition root. */
export interface AppServices {
  readonly session: DocumentSession;
  readonly renderPage: (page: number, scale: number) => Promise<Result<PageBitmap, 'renderFailed'>>;
  readonly preferences: PreferenceStore;
  readonly logger: Logger;
}
