import { err, ok, type Result } from '@shared-kernel';
import type { CloseDocument, FileHandle, IngestionError, LoadDocument, LoadedDocument } from '@ingestion';
import type { WorkspaceFactory } from './document-workspace';
import type { ObjectUrls } from './infrastructure/object-urls';
import { ObservableStore, type Listener, type Unsubscribe } from './observable-store';
import type { Logger } from './ports/logger';
import { EMPTY, type SessionState } from './session-state';

export interface DocumentSessionDeps {
  readonly loadDocument: LoadDocument;
  readonly closeDocument: CloseDocument;
  readonly objectUrls: ObjectUrls;
  readonly logger: Logger;
  readonly openWorkspace: WorkspaceFactory;
  /**
   * Prepares the analysis tools once a document is open (never at start-up, and not before the
   * document itself, which needs the bandwidth first).
   */
  readonly prepareAnalysis?: () => void;
}

/** Lifecycle of the one open document: load, confirm-before-replace, close releases all data. */
export class DocumentSession {
  private readonly state = new ObservableStore<SessionState>(EMPTY);
  /** Incremented on close, so a load that finishes after a cancel is discarded. */
  private generation = 0;

  constructor(private readonly deps: DocumentSessionDeps) {}

  snapshot(): SessionState {
    return this.state.get();
  }

  subscribe(listener: Listener): Unsubscribe {
    return this.state.subscribe(listener);
  }

  /** Refuses with `confirmReplace` while a document is open; use `replace` after confirming. */
  async load(file: FileHandle): Promise<Result<void, 'confirmReplace'>> {
    if (this.state.get().kind === 'reviewing') return err('confirmReplace');
    const generation = this.generation;
    this.state.set({ kind: 'loading' });
    const result = await this.deps.loadDocument.execute(file);
    if (generation !== this.generation) {
      await this.deps.closeDocument.execute();
      return ok(undefined);
    }
    this.state.set(result.ok ? this.reviewing(result.value) : this.refusal(result.error.code));
    if (result.ok) this.deps.prepareAnalysis?.();
    return ok(undefined);
  }

  async replace(file: FileHandle): Promise<void> {
    await this.close();
    await this.load(file);
  }

  async close(): Promise<void> {
    const wasOpen = this.state.get().kind === 'reviewing';
    this.generation += 1;
    this.state.set(EMPTY);
    this.deps.objectUrls.revokeAll();
    await this.deps.closeDocument.execute();
    if (wasOpen) this.deps.logger.log({ code: 'documentClosed' });
  }

  private reviewing(loaded: LoadedDocument): SessionState {
    this.deps.logger.log({ code: 'documentLoaded', count: loaded.document.pages.length });
    return { kind: 'reviewing', ...loaded, workspace: this.deps.openWorkspace(loaded) };
  }

  private refusal(code: IngestionError['code']): SessionState {
    return code === 'imageOnly' ? { kind: 'imageOnly' } : { kind: 'rejected', reason: code };
  }
}
