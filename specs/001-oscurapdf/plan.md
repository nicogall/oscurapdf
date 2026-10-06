# Implementation Plan: OscuraPDF

**Branch**: `001-oscurapdf` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-oscurapdf/spec.md`

## Summary

This is a static, client-only browser app. It loads a text-based PDF of up to 50 MB, builds a
single canonical text model with per-character positions, and detects PII. Detection uses
checksum-validated rules for Italian and international formats plus two on-device NER models.
The app lets the user review, select and draw redactions in one unified redaction set, and
writes a new PDF with **MuPDF.js**. The writer removes glyphs, image pixels and line art inside
each area, scrubs redacted text from side channels, and saves as a full rewrite. The app then
**verifies** the output with an independent parser (PDF.js) plus geometry, side-channel, pixel
and revision checks, before offering the file.

The code is organised as DDD bounded contexts with inward-only layering, enforced by lint and
architecture checks, and gated by coverage thresholds.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict). It is held below 6.1 for typescript-eslint
compatibility ([research R7](./research.md#r7-application-stack)).

**Primary Dependencies**:
- `mupdf@1.28.1`: render, text extraction, redaction and writing (AGPL, see R1).
- `pdfjs-dist@6.3.289`: independent verification parser.
- `@huggingface/transformers@4.3.0`: NER on ONNX Runtime Web, WebGPU with WASM fallback.
- React 19.3.0, Vite 8.3.1, vite-plugin-pwa 1.3.0, i18next 26.4.2 / react-i18next 17.0.15.

**Storage**: None for document data (in-memory only). `localStorage` holds only the UI language.
Cache Storage holds only app and model assets, via the service worker.

**Testing**:
- Vitest 5.0.3 + coverage-v8 (unit and Node integration tests against real MuPDF, PDF.js and
  Transformers.js).
- fast-check 4.10.2 (property tests).
- Playwright 1.63.0 (e2e, privacy, offline, perf, axe a11y).
- `tools/ner-eval` (SC-006a).

**Target Platform**: Current desktop Chrome, Edge, Firefox and Safari. WebGPU is optional, and
WASM is the baseline.

**Project Type**: Single-page web application (frontend only, no backend).

**Performance Goals**: For a 10-page text PDF (SC-001/002/009):
- load < 2 s, extraction < 2 s, rules < 1 s, NER < 5 s.
- Reviewable in **< 10 s**; export < 3 s and verification < 2 s.
- No main-thread task longer than 200 ms.

**Constraints**:
- **Zero egress** of document data, enforced by CSP `connect-src 'self'` and the privacy test.
- Works offline after the first load. Input ≤ 50 MB with no page limit.
- The model download (~415 MB) happens once, from our own origin.

**Scale/Scope**:
- One document at a time, one user, about 6 screens/states.
- 5 bounded contexts + presentation.
- 12 PII categories and 2 UI languages.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | How this plan complies | Pre-research | Post-design |
|---|-----------|------------------------|:---:|:---:|
| I | Local-only processing | All processing in module workers. Models are self-hosted and pinned by SHA. `allowRemoteModels=false`. CSP blocks egress. No analytics or error SDK. `NullLogger` in prod. Offline via SW. Privacy and offline e2e tests (R4, R9) | ✅ | ✅ |
| II | Irreversible, verified redaction | MuPDF `applyRedactions` removes text, image pixels (pixels mode) and line art. Side channels are scrubbed. Full-rewrite save. Six-check verification with an independent parser. UI never says "safe" unless `verified`. Original file untouched (R1, R5, R6) | ✅ | ✅ |
| III | User authority | Detection only creates candidates. Only `RedactAndExport` removes content. Manual text and area tools are always available. Accept/reject/delete/select-all. NER failure → rules + manual still work (`degraded`) | ✅ | ✅ |
| IV | One redaction model | Every source becomes a `Redaction` in `RedactionSet`, and the Engine and Verification consume only `RedactionPlan`. One `TextModel` shared by detection, selection and redaction (R2). New detectors plug into the `Detector`/`EntityRecognizer` ports | ✅ | ✅ |
| V | Test coverage & safety tests | Per-glob coverage thresholds (95/90 domain, 85/80 rest) with a no-decrease check. Fixture corpus covering all listed cases. Leak regression tests. Checksum unit and property tests. Privacy test. Synthetic data only | ✅ | ✅ |
| VI | DDD, modular architecture | 5 bounded contexts + `presentation` + `app` composition root + a small `shared-kernel`. domain ← application ← infrastructure. Ports own external libraries. Barrels only. dependency-cruiser in CI | ✅ | ✅ |
| VII | Clean code, no god objects | ESLint limits + `local/max-public-methods`. One detector per module. Three single-purpose workers instead of one. `utils/helpers/manager/misc` paths banned by dependency-cruiser | ✅ | ✅ |

**Gate result**: PASS. The one justified deviation from the spec's wording (line art under
rectangle redactions) is listed in Complexity Tracking below. It is not a constitution violation.

## Project Structure

### Documentation (this feature)

```text
specs/001-oscurapdf/
├── plan.md              # This file
├── research.md          # Phase 0: decisions, versions, risks
├── data-model.md        # Phase 1: entities per bounded context
├── quickstart.md        # Phase 1: run + validation scenarios
└── contracts/
    ├── context-apis.md      # public API per bounded context
    ├── ports-and-workers.md # ports, adapters, worker message protocol
    └── ui-contract.md       # screen states, messages, interactions
```

### Source Code (repository root)

```text
src/
├── shared-kernel/                 # geometry VOs, CharRange, Result, EntityId (no deps)
│   ├── text-normalization.ts      # the ONE normalization (NFKC, zero-width, whitespace, case-fold)
│   ├── offset-map.ts, word-boundary.ts
│   └── published/                 # cross-context published language: DetectionCandidate, PiiCategory,
│                                  # ConfidenceLevel, DetectionMethod, RedactionPlan, PlannedArea
├── contexts/
│   ├── document-ingestion/
│   │   ├── domain/                # Document, Page, TextModel, TextSpan, SupportStatus, classification rules
│   │   ├── application/           # LoadDocument, RenderPage, CloseDocument; ports: PdfReader, PageRasterizer
│   │   ├── infrastructure/        # MuPdfReader, MuPdfRasterizer, document-worker client
│   │   └── index.ts
│   ├── detection/
│   │   ├── domain/
│   │   │   ├── rules/             # email.ts, iban.ts, payment-card.ts, phone.ts, it-tax-code.ts, it-vat.ts,
│   │   │   │                      # id-document.ts, contextual-id.ts, long-number.ts, address.ts, labeled-field.ts
│   │   │   ├── checksums/         # mod97.ts, luhn.ts, codice-fiscale-check.ts, partita-iva-check.ts
│   │   │   ├── person-policy.ts   # grading of model PERSON spans (precision first)
│   │   │   └── candidate-merging.ts
│   │   ├── application/           # DetectPii, DetectionPipeline; port: EntityRecognizer
│   │   ├── infrastructure/        # TransformersJsRecognizer, EnsembleRecognizer, label mapping, worker client
│   │   └── index.ts
│   ├── redaction-review/
│   │   ├── domain/                # RedactionSet, Redaction, Occurrence, selection policy, RedactionPlan builder
│   │   ├── application/           # RedactionReview service + observable store
│   │   └── index.ts               # (no infrastructure: pure)
│   ├── redaction-engine/
│   │   ├── domain/                # ExportResult, line-art policy, side-channel policy (plan types from shared-kernel/published)
│   │   ├── application/           # ExportRedactedPdf; port: RedactionWriter
│   │   ├── infrastructure/        # MuPdfRedactionWriter, side-channel scrubbers (one per channel)
│   │   └── index.ts
│   └── verification/
│       ├── domain/                # VerificationReport, checks (one module per check), outcome rule
│       ├── application/           # VerifyRedaction; ports: IndependentPdfParser, RedactionInspector
│       ├── infrastructure/        # PdfJsParser, MuPdfInspector, verification-worker client
│       └── index.ts
├── workers/                       # document.worker.ts, detection.worker.ts, verification.worker.ts (thin: bind host → handlers)
│   ├── handlers/                  # plain, unit-testable handler functions per worker
│   └── protocol/                  # typed envelope, cancel, transfer helpers
├── app/                           # composition root: wiring, RedactAndExport, SaveDecision, Logger/FileSink/PreferenceStore adapters
├── presentation/
│   ├── screens/                   # Empty, Loading, Rejected, ImageOnly, Reviewing, Exporting, Verified, VerificationFailed
│   ├── viewer/                    # PageCanvas, TextLayer, SelectionToRedact, AreaTool, overlays
│   ├── review-list/               # Summary, RedactionItem, bulk actions
│   ├── i18n/                      # en.ts, it.ts (typed keys), language switch
│   └── main.tsx
tests/
├── unit/                          # mirrors src/contexts/*/domain + application (fakes only)
├── integration/                   # adapters in Node vs real mupdf / pdfjs / transformers
├── e2e/                           # Playwright: journeys, privacy, offline, perf, a11y, verification-failure
└── fixtures/pdf/                  # generated synthetic corpus (+ hand-made edge cases)
tools/
├── fetch-models/                  # pinned HF commits + SHA-256
├── fixtures/                      # pdf-lib fixture generators
├── ner-eval/                      # labelled IT+EN corpus + recall (SC-006a) + precision documents (SC-006b)
└── eslint-rules/                  # local/max-public-methods
public/models/                     # fetched model files (git-ignored)
```

**Structure Decision**: A single frontend project (no backend, per constitution
"Privacy & Security Constraints"). Bounded contexts live under `src/contexts/<context>/`, each
with `domain/application/infrastructure` layers and one `index.ts` barrel, mapping one-to-one to
constitution VI. `app/` is the only module allowed to import every context. `presentation/`
imports only `app/`. `redaction-review` has no infrastructure layer, because it is pure domain
logic.

Types that cross contexts live in `src/shared-kernel/published/`, so no domain layer imports
another context. There is one text normalization (`src/shared-kernel/text-normalization.ts`)
for occurrences, detection and verification. Worker entry files contain no logic: they bind
`WorkerHost` to handler modules in `src/workers/handlers/`, which are unit-tested like any
other code.

## Complexity Tracking

| Deviation | Why needed | Simpler alternative rejected because |
|-----------|------------|--------------------------------------|
| **Two NER models → one** | Planned as a two-model ensemble for recall. The browser measurement blew SC-001 (14 s even with threads), and the eval showed DistilBERT-hrl plus the rules keeps the target recall, so the research R4 fallback was applied: one model (~135 MB) | Keeping both would miss the 10 s budget on machines without WebGPU. The ensemble code still accepts more models |
| **Two PDF engines** (MuPDF + PDF.js) | Verification must be independent of the writer (Principle II) | Self-verification by MuPDF alone would share the writer's blind spots |
| **Three workers** | One per heavy concern keeps each small (Principle VII) and lets detection run while the viewer renders | One god worker would violate VII |
| **Rectangle redactions remove vector strokes that are only touched** | A signature or stamp drawn as vector paths could stay partly visible if only fully covered paths were removed | "Fully covered" mode leaks partial strokes. Clipping paths isn't supported by the engine. As a result, a stroke that crosses a rectangle's edge disappears entirely, and FR-022 now states this exception explicitly |
| **Coverage exclusions**: `src/presentation/main.tsx`, `src/workers/*.worker.ts`, `src/app/composition-root.ts`, `src/app/composition-root.e2e-fault.ts` | These entry points only create real Workers, the DOM root and browser globals; they contain no logic (handlers and wiring logic live in unit-tested modules) | Unit-testing them would require a real browser; they are exercised by every Playwright e2e test instead. The exclusion is listed in `vitest.config.ts` with the same reason |
| **SC-006a result** | `npm run eval:ner` (2026-09-30): PERSON 100%, LOCATION + ORGANIZATION 99.2% → **target tier** on the synthetic corpus. The two NER models alone reached 80% LOC+ORG (accepted minimum); Italian organizations were the gap, closed by the `organization-form` rule. NER budget: 2.1 s warm for 10 pages (< 5 s) | The corpus is synthetic and shares the naming patterns the rule targets, so real-world recall is expected to be lower. A real-world evaluation is recommended before release (see `ner-eval-report.md`) |  |
| **Precision revision (2026-10-01)** | After user feedback, detection is precision-first: model → people only; URL/organization rules removed; address, labelled-field and long-number rules added; only High preselected. `npm run eval:ner`: preselected precision 100% (39/39) on 6 realistic documents, PERSON recall 99.6% → **target tier** | Places and organizations on their own are no longer suggested (user decision). Both corpora are synthetic and written by the rule authors, so the figures are an upper bound |  |
| **Parallel detection (2026-10-01)** | 43 pages: Chromium 19.3 s → ~12–15 s, first suggestions ~4 s; WebKit 74.7 s → 24.6 s. Pool of detection workers, one model each | Memory grows with the pool (~250 MB per worker), so it is capped (3 threaded / 4 single-threaded, 1 on ≤ 4 GB devices). WebKit runs without WASM threads and stays the slowest |  |
| **Service-worker entry excluded from unit coverage** | `src/service-worker/sw.ts` only wires Workbox; it runs in the browser and is covered by the e2e suite (offline tests and the GitHub Pages simulation). Its logic (`isolation-headers.ts`) is unit-tested | Same treatment as the worker entry files |  |
| **AGPL dependency (MuPDF)** | Only mature in-browser engine with true content-removing redaction, including image pixels | PDFium WASM (Apache) needs custom glyph and image redaction, about 3–5× the effort and more leak risk. **Accepted by the owner on 2026-09-30: the app is published under AGPL-3.0** |
