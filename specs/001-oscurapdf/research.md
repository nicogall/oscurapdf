# Phase 0 Research: OscuraPDF

**Feature**: 001-oscurapdf | **Date**: 2026-09-30
**Inputs**: [spec.md](./spec.md), [constitution v1.1.0](../constitution.md), `../PRD.md` v0.2

Versions below were checked against the npm registry on 2026-09-30 and MUST be pinned exactly
(constitution, Privacy & Security Constraints).

---

## R1. PDF engine for true (irreversible) redaction in the browser

**Decision**: **MuPDF.js `mupdf@1.28.1`** (WASM) is the single *write* engine: load, render,
structured text with per-character quads, redaction, and saving.

**Rationale**:
- It is the only mature in-browser library with built-in *content-removing* redaction:
  `PDFPage.applyRedactions(blackBoxes, imageMethod, lineArtMethod, textMethod)` removes glyphs,
  **replaces image pixels** inside the area (image method "pixels"), and removes line art. This
  maps directly to FR-021/FR-022 and to the clarification "every redaction wipes all content in
  its area".
- It provides per-character quads (`StructuredText`), which gives exact bounding boxes for
  selections that span several runs, lines, or text objects (FR-013).
- It runs in module Web Workers and in Node, so the same adapter can be integration-tested in
  Node (Principle V).

**Alternatives considered**:
- *pdf-lib*: writes PDFs, but has no content-stream parsing or redaction; we would have to
  build glyph removal, font subsetting and image rewriting ourselves. Rejected (high risk of
  leaks).
- *PDF.js*: read and render only. Rejected as the write engine (kept for verification, see R5).
- *PDFium WASM*: Apache-2.0 licence, but it has no redaction API; object-level removal would
  need custom glyph splitting and image editing. Rejected for the MVP, but kept as the licence
  fallback (see risk below).
- Commercial SDKs (Apryse, Nutrient): closed-source and licence-gated. Rejected.

**Licence: ACCEPTED by the owner on 2026-09-30.** `mupdf` is **AGPL-3.0-or-later**, and the app will be published as open source under the AGPL.
Shipping it means the app's full source must be published under the AGPL, or a commercial
licence must be bought from Artifex. This is acceptable for an open-source, local-only tool.
If that is not acceptable, the fallback is PDFium WASM plus a custom redaction adapter behind
the same `RedactionWriter` port. The domain is unaffected; the Redaction Engine
infrastructure would need an estimated 3–5× the effort.

**Line-art mode choice**: MuPDF can remove vector shapes only if they are **fully covered** or
if they are **touched** by the area.
- Text redactions use *fully covered*, so table borders and underlines that cross the area survive.
- Rectangle redactions use *touched*: the user drew them over graphics (signatures, stamps),
  and removing a whole stroke that pokes outside is preferable to leaking a partly visible one.
- This means FR-022's "content outside the areas MUST be preserved" does not hold for vector
  strokes that cross a rectangle redaction's edge. See Complexity Tracking in plan.md.

---

## R2. Viewer, text layer and selection mapping

**Decision**: Render pages with MuPDF (pixmap → `ImageBitmap` → `<canvas>`), and build our **own
transparent text layer** from the domain `TextSpan` model (from MuPDF's structured text). Each
DOM text node carries the document-level character offsets of its span.

**Rationale**:
- The characters the user selects, the characters detectors scan, and the characters the
  engine removes all come from **one text model**. A selection maps to characters through DOM
  offsets and then to quads, with no geometry guessing. This satisfies FR-012/FR-013 exactly and
  keeps a single model (Principle IV).
- Using PDF.js's text layer with MuPDF redaction would mean two different text models, which
  would have to be reconciled by fuzzy geometry and could drift apart.

**Alternatives considered**: PDF.js viewer + text layer (rejected for the reason above);
selection in canvas pixels with no text layer (rejected: native text selection is required).

**Coordinate convention**: Domain geometry uses **page space**: points, origin top-left, y
downward, after page rotation as displayed (MuPDF's page space). All conversion to and from
screen pixels happens in Presentation, and conversion to PDF user space happens inside the
MuPDF adapter.

---

## R3. Deterministic detectors (rules)

**Decision**: Pure-TypeScript detectors in the Detection domain, one detector per class/module:

| Type | Method | Confidence |
|------|--------|------------|
| EMAIL | RFC-5322-lite regex + TLD sanity check | High |
| IBAN | Country-length table + ISO 13616 mod-97 | High if valid, else not reported |
| PAYMENT_CARD | 13–19 digits (with separators) + Luhn + IIN prefix | High if valid |
| PHONE | International with "+"; Italian mobile/landline only after a keyword (Tel., Cell., …) | High |
| IT_TAX_CODE (codice fiscale) | 16-char pattern (including *omocodia*) + check character; an optional space between any two characters (groups, or one character per box in printed forms), every word start tried so a near miss cannot hide the real code (2026-10-01) | High if valid |
| IT_VAT (partita IVA) | 11 digits + checksum, only after "P.IVA" / "VAT" | High |
| ID_DOCUMENT | Italian ID card (CIE) and passport patterns, only after a keyword | High |
| CONTEXTUAL_ID | Keyword (codice/n. cliente, codice utente, POD/PDR, n. pratica, n. documento, fattura n., ordine n., protocollo, polizza, tessera, rif./riferimento, contract #, …) + the whole identifier: an id-shaped token, or digit groups split by single spaces (≤ 20 digits) | High |
| CONTEXTUAL_ID (compact number) | 8–16 digits without spaces (dashes allowed), not part of a date, amount, decimal or a spaced run; revised 2026-10-01 (was: any 8+ digits, spaces allowed) | High |
| LOCATION (address) | Italian street type + name + house number, optional CAP/city/(XX) after a comma, dash or spaces; English number + name + Street/Road/…; same line only. Types and abbreviations (via, viale, traversa, frazione, Trav., V.le, P.za, L.go, Fraz., …) in any case, with an optional ordinal ("II Traversa"); types that are also ordinary words (Corso, Largo, Strada, Campo, …) only capitalised; "via Email/PEC/…" excluded (revised 2026-10-01) | High |
| URL (2026-10-04) | "http(s)://" or "www." + host, or a bare domain with a common top-level domain (it, com, org, net, eu, …); never inside an email; a full stop glued to a capitalised word ("fine.It") is a sentence boundary | High |
| VEHICLE_PLATE (2026-10-04) | Current Italian format AA 000 AA in capitals (no I, O, Q, U) anywhere; any other 5–9 character mix of capitals and digits after "targa", "targato/a", "plate number", … | High |
| ORGANIZATION (2026-10-04) | 1–4 capitalised words closed by a legal form (S.r.l., S.p.A., S.n.c., Onlus, Ltd, LLC, Inc., GmbH, …); or an institution head word (Comune, Tribunale, Ospedale, Università, Banca, Agenzia, …) followed by a proper name, never by a form label; same line only | High |
| PERSON / LOCATION (labelled field) | Value after a form label ("Cognome", "Nome", "Il sottoscritto", "Luogo di nascita", "Residente a", …): 1–3 capitalised words on the same line, stopping at the next label | High |

Text is normalized with the shared-kernel `TextNormalization` (NFKC, whitespace collapsed,
zero-width characters stripped, case-folded) before matching.

**Precision revision (2026-10-01, clarification session 2026-10-01):** after user feedback (random
numbers, "USA", fragments like "ttadinanza"), URL and organization-form rules were removed, ambiguous
formats now need a keyword, and the address, labelled-field and long-number rules were added. Low
results are never shown; only High is preselected; on an exact tie the specific category beats
CONTEXTUAL_ID. The shared `OffsetMap` maps
normalized offsets back to the original characters. There is one normalization for the whole
app (analysis finding U2).

**Extension (2026-10-04, owner request):** websites, number plates, organizations and health data are
suggested again or for the first time (spec FR-007a). The 2026-10-01 precision policy is kept: only
deterministic evidence is High. The model's organizations are Medium, and are dropped when they are an
acronym or a form value ("IBAN", "CCNL", "Celibe"), a body every organization has ("Consiglio di
Amministrazione"), or on a line written entirely in capitals (a heading). At equal confidence personal
data beats an overlapping organization, so a name next to an institution is never swallowed by it.
Known limits: a company name split across two lines is found only in part unless it also appears whole
elsewhere; the conditions list is short by design; plates in lower case need the current format to be
in capitals. On the precision corpus (now with a medical report) 78/78 preselected suggestions are correct.

**Measured on external data (2026-10-04):** the rules and the model were run on 3,000 rows of the public
synthetic dataset `rizzoaiacademy/anonimizzazione-testi-italiano` (MIT; kept outside the repository). It is
training data for another model, with its own label set, and many of its tax codes, IBANs and VAT numbers
have wrong checksums, so it measures robustness more than accuracy. First run: 87% of preselected
suggestions overlapped a labelled entity; names 80% fully covered (the rest partially: the dataset labels
the title with the name), streets 100%, organizations 77%, IBAN 30%, VAT 48%, tax codes 9%. Changes that
followed (spec FR-008, FR-007a): a valid format is enough when the text names the identifier; titles are
never names; card numbers are never taken from inside a longer code; multi-word cities, "bis"/"ter",
cooperative forms; diagnoses in running text; medicines with a dose; cadastral references; act numbers.
After: 99.9% of preselected suggestions overlap a labelled entity (5 of 6,652 do not, all institutions the
dataset does not label); IBAN, VAT, cards, cadastral data and medicines 100%, tax codes 69% (the rest do
not have the shape of a tax code), diagnoses 85%, organizations 78%, cities 59% (a city without a label or
an address is not suggested). Dates, amounts, ages, times and job titles are not looked for.

**Health data withdrawn (2026-10-04, owner decision):** the rules for clinical fields, conditions and
medicines were removed the same day they were added, with the HEALTH category. The purpose of the app is to
remove who a document is about and keep what it says: a clinical record must stay readable (for a
colleague, or for an AI) with the pathology and without the patient. Figures above that mention diagnoses
or medicines describe the removed rules.

**Alternatives considered**: Microsoft Presidio (Python, server-side; rejected by Principle I);
generic regex bundles (no checksums; rejected by FR-008).

---

## R4. Local NER (PERSON / LOCATION / ORGANIZATION, Italian + English)

**Decision**: **Transformers.js `@huggingface/transformers@4.3.0`** (ONNX Runtime Web; WebGPU
when available, WASM fallback), running **two complementary token-classification models** behind
one `EntityRecognizer` port and merging their results:

1. `onnx-community/multilang-pii-ner-ONNX` (XLM-RoBERTa base; EN/IT/DE/FR; MIT; int8 ≈ 279 MB).
   Labels GIVENNAME, SURNAME, STREET, CITY, BUILDINGNUM, … → PERSON and LOCATION/ADDRESS. Its
   reported F1 is ~0.97+ on street/city and 0.85 on surname.
2. `Xenova/distilbert-base-multilingual-cased-ner-hrl` (multilingual DistilBERT; PER/LOC/ORG,
   including Italian and English; int8 ≈ 135 MB). This supplies **ORGANIZATION**, which model 1
   lacks, and adds recall for PER/LOC.

The results are merged as a union with span-overlap reconciliation. Each entity's confidence is
derived from the model score and whether the two models agree: both agree → High, one model
with score ≥ 0.85 → Medium, otherwise → Low.

**Rationale**: The union of two models maximizes recall, which the SC-006a target needs
(≥95% PERSON, ≥85% LOC/ORG). Low-confidence items still count, because the user reviews
everything.

**Gate and fallback (SC-006a two-tier)**:
- An evaluation harness (`tools/ner-eval`) measures recall on a labelled synthetic
  Italian + English corpus, in Node with the same model files.
- If the **target** is missed but the **accepted minimum** (≥85% / ≥70%) is met, we ship and
  record the numbers and reasons in the plan and in the evaluation report, as the spec requires.
- If the SC-001 time budget (NER < 5 s for 10 pages) is blown on WASM-only machines, the tuning
  steps are, in order: chunk batching → WebGPU → drop model 1 and rely on model 2 + address
  rules. The time/recall trade-off is recorded.

**Fallback applied (2026-09-30):** in the browser, both models on single-threaded WASM took
48 s for 10 pages, and 14 s with 4 WASM threads, against a 10 s budget (SC-001). Following the fallback
order above, `multilang-pii-ner` (279 MB) was dropped. On the evaluation corpus, the remaining
DistilBERT-hrl model plus the rules keeps the same recall (PERSON 100%, LOC+ORG 99.2%) at about a third
of the time, and the download shrinks from ~415 MB to ~135 MB. Trade-offs: with one model, NER
confidence tops out at Medium (no agreement), and the synthetic corpus cannot show what the dropped
model would add on real documents. The ensemble code accepts more models (`ner-models.ts`).

**Precision policy (2026-10-01):** the model now proposes **people only**. Sub-word pieces are
aggregated per whole word (a word takes its first piece's label), so an entity can never start or end
inside a word — this removed fragments such as "ttadinanza". A PERSON span is trimmed of form labels
("Cognome", "Cittadinanza", …) and must consist of capitalised words of ≥ 2 letters. First + last name
with score ≥ 0.9 → High; a single name or score 0.85–0.9 → Medium (shown, not preselected); weaker → dropped.
Model places are discarded: places come from the address / labelled-field rules. Model organizations
were discarded too until 2026-10-04; they are now graded by their own policy (Medium, see R3).
`npm run eval:ner` now also measures precision on realistic documents (SC-006b).

**Surnames (2026-10-01, user feedback "surnames are never recognised"):** measured with the real model, single surnames scored 0.98–1.00 but were held at Medium by the policy above; after titles they could score 0.5–0.8; names in capitals were read as organizations; and the model's answer depends heavily on context (an isolated line "Presenti ROSSI MARIO e BIANCHI GIULIA" yields nothing). Changes: (1) a deterministic `titled-name` rule (title + capitalised words → PERSON High), independent of the model; (2) capitals are shown to the model in title case, same length so offsets hold; (3) greetings and legal forms are never names, elided particles ("D'Angelo") are kept, a name in capitals grows over adjacent capitalised words; (4) name-part propagation: parts of High names, or parts proposed as a person in ≥ 2 places, raise Medium names and are redacted wherever they appear, except words also used in lower case in the document ("Costa" / "costa"). The precision corpus gained a minutes document full of surnames; the evaluator now expands each suggestion to all its occurrences, as the review does.

**Italian-only models evaluated (2026-10-01):** five Italian NER models (Apache-2.0/MIT) were converted to ONNX
int8 and compared with the current model on the same benchmark: DeepMount00/Italian_NER_XXL_v2 (111 MB, BERT-base,
59 PII labels) covered 50/52 items at 2.5× the time; OpenMed PII Italian mLite (135 MB) 44/52; osiria DistilBERT IT
(67 MB) 45/52; Laibniz PII DistilBERT IT (67 MB) 45/52; osiria MiniLM IT (23 MB) 42/52, 2× faster. The current model
covered 52/52 with 140/140 IT and 140/140 EN names. Kept; the benchmark and the policy were tuned on the current model,
which favours it somewhat, but the gaps on surnames and the 2.5× slowdown of the only competitive model are larger.

**Rare surnames (2026-10-01, "Fittizio Marilena"):** with the surname first, the model marks only the first name
(1.00) and ignores the rare surname. Three model-independent remedies: a dictionary of ~330 common Italian first names
(names that are ordinary words, e.g. Rosa, Chiara, Franco, Natale, Norma, excluded) makes a capitalised word next to
one a surname (`first-name-pair` rule), never after a street type, an institution or a saint's name, and on the left
only if that word does not merely start a sentence; a first name found by the model with score >= 0.9 takes the
adjacent surname along; role labels (Docente, Dipendente, Paziente, Cliente, Richiedente, Contraente…) introduce a
name, which may not contain office or company words. The precision corpus gained an attendance register; 0 false
positives on it and on the 320-sentence corpus.

**Model replaced by a fine-tuned one (2026-10-04, owner decision):** the shipped model is now
`oscurapdf/pii-it-distilbert`: the same multilingual DistilBERT checkpoint, fine-tuned for 2 epochs on about
52,000 rows of the public synthetic dataset `rizzoaiacademy/anonimizzazione-testi-italiano` (MIT), with 22 labels
instead of 3 (scripts in `tools/pii-model`; about 90 minutes on an Apple M1 Pro). Dynamic 8-bit quantization
keeps it at 135 MB with no measurable loss against the 32-bit model, and it runs at the speed of the model
it replaces (0.6 s on `ten-pages.pdf` in Node). Its labels map to the app's categories; CITY, PROVINCE, ZIPCODE,
DATE, TIME, AMOUNT, AGE and GENDER are dropped (FR-007). People and organizations keep their policies; every
other finding of the model is Medium, never preselected, and an address needs at least two words.
Measured: alone, the model covers 66 of the 77 marked items of the precision corpus (it knows no health
data and misses names in forms) and nearly 100% of held-out rows of its own dataset, which share the
sentence templates of the training rows, so that figure is not a measure of generalisation. With the rules:
77/77 preselected suggestions correct on the precision corpus, PERSON recall 100% (IT and EN), two Medium
false positives ("ISO 9001:2015", "Piazza Venezia"). Removing one rule at a time shows every rule still
adds coverage or High confidence except `titled-name`, which the model now duplicates; it is kept because the
rules are the fallback when the model cannot load (constitution III). Every other keyword list is still needed. Known limits: training data is synthetic Italian
legal prose only (no English, no forms, no health data). The model files are published as assets of the GitHub
release `model-v1`, which the lock file names.

**How much the app trusts the fine-tuned model (2026-10-06):** measured per model label on 800 Italian
texts of an independent synthetic dataset (Ai4Privacy validation; used for measuring only, its licence
does not allow training), as the share of predictions that overlap a labelled entity. At score ≥ 0.99:
names 98%, phones 98%, emails 97%, cards 97%, streets 87%, documents 80%, act numbers 78%, IBAN 76%, VAT
33%, tax codes 17%, plates 0%. At 0.90–0.99: phones 84%, emails 74%, cards 100%, documents 54%, streets
50%, act numbers 32%. So nothing the model finds is promoted to High, the labels the rules check by
format (CF, PIVA, IBAN, TARGA) are no longer taken from the model, and its other findings need 0.99
(0.90 for phones, emails and cards). With the rules, against the model shipped before: items shown on that
dataset 62.0% → 68.3% (74.0% before this tightening), unlabelled Medium suggestions 103 → 137 (240
before), preselected unchanged at 52%. 8-bit quantization is not the limit: the 32-bit model scores 95.3%
against 94.3% there, model alone and with every label counted.

**Larger model re-evaluated (2026-10-01):** `onnx-community/multilang-pii-ner-ONNX` (XLM-RoBERTa, int8
279 MB; 4-bit variants are larger, 820 MB) was measured again against the current model on the precision corpus, the
sentence corpus and surname probes. Alone: precision 52/52, items covered 49/52, names 268/280, 2× slower. Together
with the current model: the same coverage as the current model alone (52/52, 280/280), one extra Medium false
positive, 3× slower. Rejected again. The comparison found a real alignment bug (SentencePiece glues punctuation to
the previous piece, so "Esposito," became one word) — fixed for every tokenizer.

**Parallel, segmented detection (2026-10-01):** a 43-page document took ~19 s (Chromium, 1 worker × 4 WASM threads)
and ~75 s in WebKit (no WASM threads). The text is now cut into ~12,000-character segments at line boundaries (one-line
overlap) and spread over a pool of detection workers (`SegmentedDetection`); each segment's suggestions are shown as
soon as it is done, and overlap resolution plus name propagation run once over the whole text. Measured on 43 pages,
10 cores, models cached:

| Configuration | Chromium | WebKit |
|---|---|---|
| 1 worker × 4 threads (before) | 19.3 s | — |
| 1 worker × 1 thread | 115 s | 74.7 s |
| 2 × 4 threads (chosen when isolated) | 12.2 s | — |
| 4 × 2 threads | 11.3 s (twice the memory) | — |
| 4 × 1 thread (chosen without isolation) | — | 24.6 s |

Pool policy (`detection-pool-size.ts`): cross-origin isolated → one 4-thread worker per 4 cores, max 3; otherwise up
to 4 single-threaded workers; ≤ 4 GB device memory → 1 worker. The models are also loaded at start-up (first worker
alone, so it fills the model cache, then the others), so the first document does not pay the ~5 s model start. Names
never cross a line break (found while checking that segmented and whole-text detection agree).

**Runtime details learned during implementation**:
- **Device:** WebGPU is chosen only when `navigator.gpu.requestAdapter()` returns an adapter.
  Headless browsers expose `navigator.gpu` without one, and the failed WebGPU attempt made every
  model download three times.
- **Offline caching (FR-029):** Transformers.js loads `.onnx` files through `env.fetch` without
  consulting its cache. A cache-first `env.fetch` backed by our `ModelCache` stores each model file
  once, with clean headers. Transformers.js' default browser cache is disabled.
- **Service worker:** the detection worker is created lazily once the service worker controls the
  page, so the ONNX runtime binaries go through its cache.
- **Threads:** with cross-origin isolation (COOP `same-origin` + COEP `credentialless`), inference uses up
  to 4 WASM threads. ONNX Runtime's thread workers load their glue outside the service worker, so the
  runtime files are handed to it as blob URLs, which keeps offline detection working.

**Alternatives considered**:
- *GLiNER multi-PII* via `gliner@0.0.19`: a single zero-shot model covering all labels.
  Rejected for now because the JS runtime is pre-1.0; it stays a candidate adapter behind the
  same port.
- *A single small NER model*: unlikely to reach the target tier.
- *An LLM*: out of scope for the MVP (FR-011 extension point only).

**Model hosting**: Model files are **self-hosted** under `/models/<id>/`, fetched at build time by
`tools/fetch-models` pinned to a Hugging Face commit SHA (recorded in `models.lock.json`) and checked
by SHA-256. The folder name omits the commit because Transformers.js cannot load paths containing `@`.
The ONNX Runtime WASM binaries are also served from our origin (`/ort/`, copied from
`node_modules/onnxruntime-web/dist`); by default Transformers.js would fetch them from a CDN.
The runtime is configured with `env.allowRemoteModels = false` and
`env.localModelPath = '/models/'`. There is no runtime call to the Hugging Face Hub
(Principle I, FR-029).

---

## R5. Verification independence

**Decision**: Verification opens the output PDF with **two parsers**:
- **PDF.js `pdfjs-dist@6.3.289`**: an *independent* engine, used for the validity check and
  full text extraction.
- **MuPDF**: used for the geometric check (no remaining glyph intersects any redaction area),
  scanning metadata/annotations/forms/outlines/attachments, and checking image pixels inside
  areas.

**Rationale**: If the writer also verified itself, a bug in the writer could be repeated by the
verifier. Parsing with a second engine makes such shared blind spots much less likely
(Principle II).

**Checks (all must pass)**:
1. Valid PDF: opens in both engines, and the page count equals the input's.
2. Text absence: no redacted text appears in either engine's extracted text. Matching uses the
   shared `TextNormalization` (NFKC, zero-width characters stripped, whitespace collapsed,
   case-folded) and whole-word boundaries, which is the same rule as occurrence matching
   (FR-012a).
3. Geometry: no character quad in the output intersects any redaction area.
4. Side channels: none of the redacted texts appears in document info, XMP, outline titles,
   annotation contents, form-field values, or attachment names/content.
5. Images: every image pixel region under an area is uniform (the black fill), with no
   residual variance.
6. No earlier revisions: the output has a single cross-reference section (no incremental
   updates).

---

## R6. Export writing and side channels (FR-021, clarification Q2)

**Decision**: Apply redactions per page, then scrub side channels **only where they contain
redacted text**:
- Info dictionary, XMP, outline titles, annotation /Contents, and form-field values: the
  matching substring is deleted.
- Attachments whose name or (text-extractable) content contains redacted text are removed
  entirely, and the removal is reported.

Save as a **full rewrite with garbage collection** (no incremental save), which drops earlier
revisions. All other document-level data is kept, per clarification Q2.


**Output size (2026-10-02):** with `REDACT_IMAGE_PIXELS`, MuPDF replaces a redacted image by a new, uncompressed one
(saved with lossless Flate), so a scanned JPEG page grew about 5× (751 KB → 3.5 MB for one name). Images that were JPEG
before redaction (matched by pixel size, since the resource is renamed) are now re-encoded as JPEG at quality 85
(`jpeg-recompression.ts`); the pixels are blanked before re-encoding, so nothing removed can return, and lossless images
stay lossless; images with a soft mask are left as MuPDF wrote them. Result: 751 KB → 848 KB. Verification compares
pixels of JPEG images 8 px (one JPEG block) inside each area instead of 2 px, because compression ringing from the
neighbouring pixels reaches a few pixels in; a negative control (the unredacted original) still fails the check.
---

## R7. Application stack

| Concern | Decision | Version |
|---------|----------|---------|
| Language | TypeScript (strict, `exactOptionalPropertyTypes`) | 6.0.3 (typescript-eslint supports < 6.1) |
| UI | React | 19.3.0 |
| Build | Vite + `@vitejs/plugin-react` | 8.3.1 / 6.1.1 |
| Offline | `vite-plugin-pwa` (Workbox; precache the app, cache-first `/models/*`) | 1.3.0 |
| i18n | i18next + react-i18next, typed resources, EN/IT | 26.4.2 / 17.0.15 |
| Workers | Native module workers + a small typed message-contract layer (no RPC library) | — |
| State | Application-layer observable stores; React subscribes via `useSyncExternalStore` (no state library) | — |

**Rationale**: This follows the PRD's recommended stack, with the fewest dependencies
(Principle VII, YAGNI). The TypeScript version is held at 6.0 until typescript-eslint supports
7.x.

---

## R8. Quality gates and tooling (constitution V–VII)

| Gate | Tool | Version |
|------|------|---------|
| Unit + integration tests, coverage (v8) with per-glob thresholds | Vitest + `@vitest/coverage-v8` | 5.0.3 |
| Property-based tests (checksums, offset maps, geometry) | fast-check | 4.10.2 |
| E2E, privacy (network capture), offline, accessibility smoke tests | Playwright | 1.63.0 |
| Clean-code limits | ESLint core rules (`max-lines` 300, `max-lines-per-function` 40, `max-params` 4, `complexity` 10, `max-depth` 3) + local rule `local/max-public-methods` (10) | eslint 10.11.0, typescript-eslint 8.71.0 |
| Architecture boundaries, no cycles, banned `utils/helpers/manager/misc` paths | dependency-cruiser | 18.4.0 |
| Fixture PDFs (dev only) | pdf-lib for deterministic generation, plus hand-made edge cases | 1.17.1 |

Coverage thresholds in `vitest.config.ts`:
- `src/contexts/*/domain/**`: lines 95, branches 90.
- Everything else under `src/**`: lines 85, branches 80.
- CI also compares coverage against the base branch, so it can never decrease.

---

## R9. Privacy enforcement

- **CSP** (production): `default-src 'self'; connect-src 'self'; worker-src 'self' blob:;
  script-src 'self' 'wasm-unsafe-eval'; img-src 'self' blob: data:; object-src 'none'`. The
  browser therefore blocks any accidental egress.
- There is no analytics or error-tracking SDK.
- A logger port has a production adapter that drops messages with a `document` payload
  classification. Messages are built from typed codes, never from document strings.
- File names are shown in the UI but never logged or placed in URLs. Object URLs are revoked
  after download.
- **Privacy test** (Playwright): it records every request during a full session and asserts
  that every request is a same-origin `GET` for a precached/static asset, that no request has a
  body, and that no request URL contains any fixture PII string.
- **Offline test**: the browser goes offline after the first load, and the full flow must pass.

---

**GitHub Pages (2026-10-02):** static hosting without custom headers. Cross-origin isolation (WASM threads)
is provided by the app's own Workbox service worker (`src/service-worker/sw.ts`, `injectManifest`), which adds
COOP/COEP/CORP to every response it serves; on the first visit the page reloads once when the worker takes
control, only if no document is open (`isolation-reload.ts`). The CSP is a `<meta>` tag, so it applies on
Pages too. Paths follow `import.meta.env.BASE_URL` (`/oscurapdf/`). GitHub documents no per-file limit for
Actions-deployed sites (1 GB per site), so the 135 MB model is deployed as is.

**Cloudflare Pages (2026-10-02):** files are limited to 25 MiB. The build splits large files under `models/`
and `ort/` into 20 MiB parts with a per-folder `chunks.json` (size and SHA-256 per part); `chunked-fetch.ts`
streams the parts in order, verifying each, so Transformers.js and the offline cache see the original file.
`deploy:check` fails the build if any file is over the limit. Only the `asyncify` ONNX Runtime variant is
shipped (it serves both the WASM and WebGPU backends; the other three were never loaded: −59 MB), and the
fallback copy Vite emitted into `assets/` (also precached by the service worker) is dropped. The runtime is
loaded and verified once by the page and handed to every detection worker (`useRuntime`) — loading it in
each of 4 workers saturated WebKit (7 e2e failures, 14 min) and wasted memory. `_headers` sends the isolation
headers; the source archive (`git archive`) is published with each release for AGPL-3.0.

## R10. Accessibility (outstanding, low impact from /speckit-clarify)

**Decision**: WCAG 2.1 AA for app chrome (review list, dialogs, buttons, keyboard operation of
the review list and export). An axe-core check runs in Playwright on the main screens.
Redaction on the canvas remains pointer-driven in the MVP; the text layer is still reachable
by keyboard selection.

---

## Open items carried into implementation (not blocking the plan)

- **SC-006a results**: target vs. accepted minimum, filled in after the `tools/ner-eval` run.
- The line-art trade-off for rectangle redactions (R1) is now written into FR-022.
