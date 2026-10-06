import { textPdf, type Fixture } from '../fixture';

/** Expected findings: category, and the minimum confidence the detector must give. */
export const PII_TRUTH = {
  expected: [
    { text: 'John Smith', category: 'PERSON', confidence: 'high' },
    { text: 'Mario Rossi', category: 'PERSON', confidence: 'high' },
    { text: 'Roma', category: 'LOCATION', confidence: 'high' },
    { text: 'john.smith@example.com', category: 'EMAIL', confidence: 'high' },
    { text: 'mario.rossi@example.it', category: 'EMAIL', confidence: 'high' },
    { text: '+39 333 123 4567', category: 'PHONE', confidence: 'high' },
    { text: 'IT60X0542811101000000123456', category: 'IBAN', confidence: 'high' },
    { text: '4111 1111 1111 1111', category: 'PAYMENT_CARD', confidence: 'high' },
    { text: 'RSSMRA85T10A562S', category: 'IT_TAX_CODE', confidence: 'high' },
    { text: '01234567897', category: 'IT_VAT', confidence: 'high' },
    { text: 'https://www.acme-holdings.example.com', category: 'URL', confidence: 'high' },
    // A legal form is deterministic evidence (High); the model alone is shown, not preselected (Medium).
    { text: 'ACME Holdings Ltd.', category: 'ORGANIZATION', confidence: 'high' },
    { text: 'Globex Corporation', category: 'ORGANIZATION', confidence: 'medium' },
  ],
  /**
   * Wrong checksums with the right shape (clarification 2026-10-04): still reported as that type when
   * the text calls them so ("IBAN (corrupted): …"), at least shown when it does not; the VAT number
   * far from its keyword is covered as a generic identifier. A card with a wrong check and no "card"
   * right before it has no shape of its own to go by, and is not reported.
   */
  corrupted: [
    { text: 'IT60X0542811101000000123457', category: 'IBAN', reported: true },
    { text: '4111 1111 1111 1112', category: 'PAYMENT_CARD', reported: false },
    { text: 'RSSMRA85T10A562T', category: 'IT_TAX_CODE', reported: true },
    { text: '01234567890', category: 'CONTEXTUAL_ID', reported: true },
  ],
  /** Present in the document but not personal data we are sure of: never suggested (precision first). */
  notSuggested: ['London', 'Torino', 'Personal data sheet'],
} as const;

/** pii-sampler.pdf: valid and corrupted identifiers, IT and EN names, places and organizations. */
export const generate = async (): Promise<Fixture[]> => [
  {
    fileName: 'pii-sampler.pdf',
    bytes: await textPdf([
      [
        'Personal data sheet / Scheda dati personali',
        'Name: John Smith. Nome: Mario Rossi, nato a Roma.',
        'Email: john.smith@example.com, mario.rossi@example.it',
        'Phone: +39 333 123 4567',
        'IBAN: IT60X0542811101000000123456',
        'IBAN (corrupted): IT60X0542811101000000123457',
        'Card: 4111 1111 1111 1111 and corrupted 4111 1111 1111 1112',
        'Codice fiscale: RSSMRA85T10A562S; errato: RSSMRA85T10A562T',
        'P.IVA 01234567897; errata: 01234567890',
        'Website: https://www.acme-holdings.example.com',
        'Employer: Globex Corporation, London. Datore di lavoro: ACME Holdings Ltd., Torino.',
      ],
    ]),
    truth: PII_TRUTH,
  },
];
