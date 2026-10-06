import type { Detector } from '../detector';
import { addressDetector } from './address';
import { cadastralReferenceDetector } from './cadastral-reference';
import { contextualIdDetector } from './contextual-id';
import { emailDetector } from './email';
import { firstNamePairDetector } from './first-name-pair';
import { ibanDetector } from './iban';
import { idDocumentDetector } from './id-document';
import { itTaxCodeDetector } from './it-tax-code';
import { itVatDetector } from './it-vat';
import { labeledFieldDetector } from './labeled-field';
import { longNumberDetector } from './long-number';
import { organizationDetector } from './organization';
import { paymentCardDetector } from './payment-card';
import { phoneDetector } from './phone';
import { titledNameDetector } from './titled-name';
import { urlDetector } from './url';
import { vehiclePlateDetector } from './vehicle-plate';

/**
 * Every deterministic rule detector (research R3, revised 2026-10-01: only what we are sure of;
 * websites, plates and organizations added 2026-10-04; health data is deliberately not suggested).
 */
export const RULE_DETECTORS: readonly Detector[] = [
  emailDetector,
  ibanDetector,
  paymentCardDetector,
  phoneDetector,
  itTaxCodeDetector,
  itVatDetector,
  idDocumentDetector,
  contextualIdDetector,
  longNumberDetector,
  addressDetector,
  labeledFieldDetector,
  titledNameDetector,
  firstNamePairDetector,
  urlDetector,
  vehiclePlateDetector,
  organizationDetector,
  cadastralReferenceDetector,
];
