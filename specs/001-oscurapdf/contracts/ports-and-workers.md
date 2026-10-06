# Contract: Domain Ports, Adapters and Worker Messages

## Ports (owned by domain/application layers; implemented in `infrastructure/`)

| Context | Port | Production adapter | Test double |
|---------|------|--------------------|-------------|
| Ingestion | `PdfReader` (open, classify, page sizes, structured text with char quads) | `MuPdfReader` (document worker) | `FakePdfReader` (in-memory pages) |
| Ingestion | `PageRasterizer` | `MuPdfRasterizer` | stub bitmap |
| Detection | `Detector` (one per rule) | pure domain classes, no adapter | — |
| Detection | `EntityRecognizer` | `TransformersJsRecognizer` (detection worker; one instance per model), `EnsembleRecognizer` | `ScriptedRecognizer` |
| Engine | `RedactionWriter` (apply areas, scrub side channels, save with full rewrite) | `MuPdfRedactionWriter` | `RecordingWriter` |
| Verification | `IndependentPdfParser` (validity, text) | `PdfJsParser` (verification worker) | fake |
| Verification | `RedactionInspector` (glyph geometry, side channels, image pixels, revision count) | `MuPdfInspector` | fake |
| App | `FileSink` (offer the output for saving; revokes the object URL) | `BrowserDownloadSink` | recorder |
| App | `Logger` (typed event codes only) | `ConsoleLogger` (dev) / `NullLogger` (prod) | spy |
| App | `PreferenceStore` (language only) | `LocalStoragePreferenceStore` | memory |

**Rules**:
- The domain never imports an adapter.
- Adapters never contain business rules; for example, the checksum logic lives in the domain,
  and the adapter only moves bytes.
- Every adapter has integration tests against real libraries in Node (MuPDF, PDF.js, and
  Transformers.js all run in Node) using the fixture corpus.

## Workers

There are three module workers, one per heavy infrastructure concern (constitution VI/VII, no
god worker):

| Worker | Hosts | Owned by context |
|--------|-------|------------------|
| `document.worker.ts` | MuPDF: open, extract, rasterize, apply redactions, save | Ingestion + Engine adapters (one MuPDF instance, so the doc is not copied twice) |
| `detection.worker.ts` | Rule detectors + Transformers.js models | Detection |
| `verification.worker.ts` | PDF.js + a separate MuPDF instance used for inspection | Verification |

### Message envelope (typed, versioned)

```ts
type Request<K extends string, P>  = { v: 1; id: string; kind: K; payload: P };
type Response<K extends string, R> =
  | { v: 1; id: string; kind: K; ok: true;  result: R }
  | { v: 1; id: string; kind: K; ok: false; error: { code: string } }   // no free-text messages
  | { v: 1; id: string; kind: 'progress'; stage: string; fraction: number };
```

Rules:
- The host posts `{ v: 1, kind: 'ready' }` once it is listening. The client queues every request until then, because a module worker still in its top-level `await` (MuPDF instantiating WASM) drops messages that arrive before its listener exists.
- If a worker script fails to load (`error` event), every pending and later request fails with `workerUnavailable` instead of waiting forever.
- Binary data is sent as a transferable `ArrayBuffer`, never copied or serialized to strings.
- Error payloads carry **codes only**, so no document text crosses into logs.
- Any request can be cancelled with `{ kind: 'cancel', id }`. The worker stops at its next
  checkpoint (per page or per chunk) and responds with `ok: false, code: 'cancelled'`.
- On `close`, the document worker destroys MuPDF objects and drops its buffers (FR-031).
