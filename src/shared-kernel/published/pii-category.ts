export const PII_CATEGORIES = [
  'PERSON',
  'LOCATION',
  'ORGANIZATION',
  'EMAIL',
  'PHONE',
  'IBAN',
  'PAYMENT_CARD',
  'URL',
  'IT_TAX_CODE',
  'IT_VAT',
  'ID_DOCUMENT',
  'CONTEXTUAL_ID',
  'VEHICLE_PLATE',
] as const;

export type PiiCategory = (typeof PII_CATEGORIES)[number];
