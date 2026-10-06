import { normalizeText } from '@shared-kernel';

/** The normalized text that identifies a text redaction (shared normalization; no local rules). */
export const redactionKey = (text: string): string => normalizeText(text).normalized.trim();
