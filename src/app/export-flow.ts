import { err, ok, type Result } from '@shared-kernel';
import type { RedactionReview } from '@review';
import type { VerificationReport } from '@verification';
import { redactedFileName } from './infrastructure/browser-download-sink';
import { ObservableStore } from './observable-store';
import type { FileSink } from './ports/file-sink';
import type { RedactAndExport } from './redact-and-export';
import { isAcknowledgement, type UnverifiedSaveAcknowledgement } from './save-decision';

export type ExportState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'exporting'; readonly fraction?: number }
  | { readonly kind: 'exportFailed' }
  | { readonly kind: 'verified'; readonly report: VerificationReport }
  | { readonly kind: 'verificationFailed'; readonly report: VerificationReport }
  | { readonly kind: 'acknowledgeUnverified'; readonly report: VerificationReport };

export interface ExportFlowDeps {
  readonly redactAndExport: RedactAndExport;
  readonly fileSink: FileSink;
  readonly review: RedactionReview;
  readonly inputPageCount: number;
  readonly fileName: string;
}

export type SaveError = 'acknowledgementRequired' | 'nothingToSave';

/** Export → verify → save screens for one document (contracts/ui-contract.md). */
export class ExportFlow {
  readonly store = new ObservableStore<ExportState>({ kind: 'idle' });
  private output: Uint8Array | undefined;

  constructor(private readonly deps: ExportFlowDeps) {}

  async start(): Promise<void> {
    if (this.store.get().kind === 'exporting') return;
    this.store.set({ kind: 'exporting' });
    const result = await this.deps.redactAndExport.execute(this.deps.review, this.deps.inputPageCount, (_stage, fraction) => {
      this.store.set({ kind: 'exporting', fraction });
    });
    if (!result.ok) {
      this.store.set(result.error === 'nothingSelected' ? { kind: 'idle' } : { kind: 'exportFailed' });
      return;
    }
    this.output = result.value.output;
    const { report } = result.value;
    this.store.set(result.value.decision.kind === 'offerSave' ? { kind: 'verified', report } : { kind: 'verificationFailed', report });
  }

  requestUnverifiedSave(): void {
    const state = this.store.get();
    if (state.kind === 'verificationFailed') this.store.set({ kind: 'acknowledgeUnverified', report: state.report });
  }

  cancelUnverifiedSave(): void {
    const state = this.store.get();
    if (state.kind === 'acknowledgeUnverified') this.store.set({ kind: 'verificationFailed', report: state.report });
  }

  /** Verified output saves directly; unverified output needs the acknowledgement (FR-026a). */
  save(acknowledgement?: UnverifiedSaveAcknowledgement): Result<void, SaveError> {
    const state = this.store.get();
    if (this.output === undefined) return err('nothingToSave');
    const allowed = state.kind === 'verified' || (state.kind === 'acknowledgeUnverified' && isAcknowledgement(acknowledgement));
    if (!allowed) return err('acknowledgementRequired');
    this.deps.fileSink.save(this.output, redactedFileName(this.deps.fileName));
    return ok(undefined);
  }

  backToReview(): void {
    this.output = undefined;
    this.store.set({ kind: 'idle' });
  }
}
