import type { VerificationReport } from '@verification';

export type SaveDecision = { readonly kind: 'offerSave' } | { readonly kind: 'requireAcknowledgement' };

/** FR-026a: a failed verification may only be saved after an explicit acknowledgement. */
export const decideSave = (report: VerificationReport): SaveDecision =>
  report.outcome === 'verified' ? { kind: 'offerSave' } : { kind: 'requireAcknowledgement' };

const ACKNOWLEDGED: unique symbol = Symbol('unverifiedSaveAcknowledged');

/** Proof that the user ticked "I understand this file may still contain the redacted information". */
export interface UnverifiedSaveAcknowledgement {
  readonly [ACKNOWLEDGED]: true;
}

export const confirmUnverifiedSave = (): UnverifiedSaveAcknowledgement => ({ [ACKNOWLEDGED]: true });

export const isAcknowledgement = (value: unknown): value is UnverifiedSaveAcknowledgement =>
  typeof value === 'object' && value !== null && (value as Partial<UnverifiedSaveAcknowledgement>)[ACKNOWLEDGED] === true;
