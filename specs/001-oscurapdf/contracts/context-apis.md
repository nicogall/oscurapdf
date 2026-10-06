# Contract: Bounded-Context Public APIs

Each context exposes **only** its `index.ts` barrel (constitution VI). dependency-cruiser forbids
imports of any other path inside a context from outside it. Signatures are normative. Names use
the ubiquitous language from [data-model.md](../data-model.md).

Types that cross contexts (`DetectionCandidate`, `PiiCategory`, `ConfidenceLevel`,
`RedactionPlan`, `PlannedArea`) are imported from `@shared-kernel/published`, never from
another context's domain. The same goes for `TextNormalization`, `OffsetMap` and `WordBoundary`
from `@shared-kernel`.

All use cases are asynchronous, return `Result`, and never throw across a context boundary.
Error types are closed unions of codes and never contain document text.

```ts
// ── document-ingestion/index.ts ─────────────────────────────────────────────
export interface LoadDocument {
  execute(file: FileHandle): Promise<Result<LoadedDocument, IngestionError>>;
}
export type IngestionError =
  | { code: 'notPdf' } | { code: 'invalid' } | { code: 'tooLarge'; limitBytes: 52_428_800 }
  | { code: 'passwordProtected' } | { code: 'imageOnly' };
export interface LoadedDocument {
  document: DocumentView;          // read-only projection of the aggregate
  textModel: TextModelView;        // occurrencesOf, areasFor, pageOf
  pagesWithoutText: PageIndex[];   // partiallySupported → listed as "not checked"
}
export interface RenderPage {
  execute(page: PageIndex, scale: number): Promise<Result<PageBitmap, RenderError>>;
}
export interface CloseDocument { execute(): Promise<void>; } // releases engine memory (FR-031)

// ── detection/index.ts ──────────────────────────────────────────────────────
export interface DetectPii {
  execute(text: TextModelView, progress: ProgressSink): Promise<Result<DetectionCandidate[], DetectionError>>;
}
// If NER fails, DetectPii still returns the rule results and sets `degraded: true` in the
// progress sink (constitution III: fail gracefully).

// ── redaction-review/index.ts ───────────────────────────────────────────────
export interface RedactionReview {
  addCandidates(c: DetectionCandidate[]): void;
  addManualText(range: CharRange): Result<RedactionId, ReviewError>;   // FR-012, FR-012a
  addManualArea(area: PageArea): Result<RedactionId, ReviewError>;     // FR-014
  select(id: RedactionId): void;  deselect(id: RedactionId): void;
  selectAll(): void;              deselectAll(): void;
  delete(id: RedactionId): Result<void, ReviewError>;                  // manual only
  subscribe(listener: (s: ReviewSnapshot) => void): Unsubscribe;
  snapshot(): ReviewSnapshot;       // items + summary, for Presentation
  toPlan(): Result<RedactionPlan, ReviewError>;  // err 'nothingSelected'
}

// ── redaction-engine/index.ts ───────────────────────────────────────────────
export interface ExportRedactedPdf {
  execute(plan: RedactionPlan, progress: ProgressSink): Promise<Result<ExportResult, ExportError>>;
}

// ── verification/index.ts ───────────────────────────────────────────────────
export interface VerifyRedaction {
  execute(output: Uint8Array, plan: RedactionPlan, inputPageCount: number): Promise<VerificationReport>;
}
```

## Composition

Composition happens in the `app/` composition root, the **only** module allowed to import every
context. Its orchestration use case is:

```text
RedactAndExport = Review.toPlan → Engine.execute → Verification.execute → SaveDecision
```

- `SaveDecision` is `offerSave` when the outcome is `verified`, and
  `requireAcknowledgement` when it is `failed` (FR-026a).
- Presentation depends only on `app/` facades, never on context internals. Read-only view types
  (`DocumentView`, `TextModelView`, `ReviewSnapshot`) are re-exported from `src/app/views.ts`.
