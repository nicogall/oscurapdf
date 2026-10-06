# Quickstart & Validation Guide: OscuraPDF

How to run the app and show that the feature works end to end. Design details are in
[data-model.md](./data-model.md) and [contracts/](./contracts/). Decisions and versions are in
[research.md](./research.md).

## Prerequisites

- Node.js 22 LTS or newer, and npm
- About 300 MB of free disk space for the NER model and runtime files
- A current desktop Chrome, Edge, Firefox or Safari

## Setup

```bash
npm ci
npm run models:fetch        # tools/fetch-models: downloads pinned model commits into public/models, verifies SHA-256
npm run fixtures:build      # tools/fixtures: generates synthetic PDF corpus into tests/fixtures/pdf
npx playwright install
```

## Run

```bash
npm run dev                 # dev server
npm run build && npm run preview   # production build with CSP and service worker
```

## Quality gates (all are blocking in CI; constitution V–VII)

| Command | Proves | Expected |
|---------|--------|----------|
| `npm run typecheck` | Strict types | 0 errors |
| `npm run lint` | Clean-code limits (≤40 lines/function, ≤300 lines/file, ≤4 params, complexity ≤10, depth ≤3, ≤10 public methods) | 0 errors |
| `npm run arch` | dependency-cruiser: domain has no outward imports, only barrels used across contexts, no cycles, no `utils/helpers/manager/misc` | 0 violations |
| `npm run test:coverage` | Unit + integration tests; coverage domain ≥95/90, rest ≥85/80 | All pass, thresholds met |
| `npm run test:e2e` | Playwright journeys, privacy, offline, a11y | All pass |
| `npm run eval:ner` | SC-006b precision on realistic documents and SC-006a PERSON recall | Prints the tier: **target** / **accepted minimum** / **fail** (fails if preselected precision < 95%) |

## Validation scenarios

Use `npm run preview`. Fixtures are in `tests/fixtures/pdf/`. Each scenario is also automated in
`tests/e2e/`.

| # | Spec link | Steps | Expected outcome |
|---|-----------|-------|------------------|
| 1 | US1, FR-012/13/21 | Open `contract-it-en.pdf`, select "ACME Holdings Ltd." across the line break → **Redact** → **Redact & Export** → Save | The list shows a MANUAL item ×3 (all occurrences). The report says verified with all checks ✓. In the output, searching or copying "ACME" finds nothing, and black boxes appear in 3 places |
| 2 | US2, FR-006–010, FR-009a | Open `pii-sampler.pdf` | EMAIL, PHONE, IBAN, PAYMENT_CARD, IT_TAX_CODE, IT_VAT, PERSON, the birthplace, the website (URL) and the company with a legal form (ORGANIZATION) appear as High and preselected; the company found only by the model appears as Medium, not preselected. The corrupted IBAN and tax code have the right shape and are still suggested as that type (FR-008, 2026-10-04); the corrupted card, far from the word "card", is not; the corrupted VAT number is covered as a generic identifier. Cities without a label are not suggested. Nothing is removed until export |
| 3 | US2, FR-018 | Deselect "John Smith" → export | "John Smith" is still present in the output. All other selected items are gone |
| 4 | US3, FR-022 | Open `signed-letter.pdf`, choose **Draw redaction** over the signature image → export | The image pixels in the area are black. Extracting the images from the output shows no signature pixels |
| 5 | FR-022, Q1 | Open `scanned-with-ocr-layer.pdf`, select a name in the hidden text layer → export | Both the hidden text and the picture of the name are gone (check by rendering the output page) |
| 6 | FR-021, Q2 | Open `metadata-leak.pdf` (redacted name also in Author, a comment, a form field, and an older revision) → redact the name → export | The name is absent from all of those. The rest of the metadata (e.g., the Producer) is unchanged. The output has a single revision |
| 7 | US4, FR-003/3a/4/5 | Drop `not-a-pdf.txt`, `corrupt.pdf`, `51mb.pdf`, `locked.pdf`, `scan-only.pdf` | The matching `rejected` or `imageOnly` message appears. There is no "checked" wording anywhere |
| 8 | FR-025/26/26a | Run `npm run test:e2e -- --grep verification-failure` (injects a faulty writer in the test build) | The `verificationFailed` screen appears. Save requires the acknowledgement checkbox |
| 9 | FR-027–030, SC-004 | Run `npm run test:e2e -- --grep privacy` | Every request is a same-origin static GET, with no request bodies and no PII in URLs |
| 10 | FR-029, SC-005 | Run `npm run test:e2e -- --grep offline` | The full flow passes with the network disabled after the first load |
| 11 | FR-033 | Open the app with the browser set to `it-IT`, then to `en-US` | The UI is Italian in both cases, with no language switch |
| 12 | SC-001/002 | Run `npm run test:perf` on reference hardware with `ten-pages.pdf` | Reviewable in < 10 s. Export + verify in < 5 s |
