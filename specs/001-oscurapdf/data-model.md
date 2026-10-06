# Data Model: OscuraPDF

**Feature**: 001-oscurapdf | **Date**: 2026-09-30
All entities are in-memory only (FR-030/FR-031). Nothing here is persisted except the UI
language setting.

Conventions:
- Value objects are immutable, and every invariant is enforced by a factory that returns
  `Result<T, DomainError>` (the domain never throws).
- Geometry uses **page space**: points, origin top-left, y down, rotation applied
  ([research R2](./research.md#r2-viewer-text-layer-and-selection-mapping)).

---

## Shared kernel (`src/shared-kernel`)

Kept minimal; used by every context.

| Type | Kind | Fields | Invariants |
|------|------|--------|------------|
| `PageIndex` | VO | `value: number` | Integer ≥ 0 |
| `BoundingBox` | VO | `x, y, width, height: number` | All finite; width > 0; height > 0 |
| `PageArea` | VO | `page: PageIndex`, `box: BoundingBox` | The box lies within that page's size (checked by the owning context) |
| `CharRange` | VO | `start, end: number` (document-level character offsets) | 0 ≤ start < end |
| `Result<T,E>` | type | `ok \| err` | — |
| `EntityId<Brand>` | VO | opaque string | Unique per session; random, never derived from content |
| `TextNormalization` | pure function | `normalize(text) → { normalized, offsets: OffsetMap }` | NFKC; zero-width characters removed; runs of whitespace (including line breaks) → one space; case-folded. The **only** normalization in the app, used by `TextModel.occurrencesOf`, the redaction key, detectors and verification |
| `OffsetMap` | VO | normalized offset → original offset | Monotonic; `toOriginal(range)` returns the original `CharRange` exactly |
| `WordBoundary` | pure functions | `isWholeWord(text, range)`, `findWholeWordOccurrences(text, needle)` | A word character is a Unicode letter, number or combining mark (`\p{L}\p{N}\p{M}`); everything else (space, apostrophe, hyphen, punctuation) is a boundary |

### Published language (`src/shared-kernel/published/`)

These are the types that cross bounded contexts. They live here so that no domain layer has to
import another context (constitution VI; analysis finding I1).

#### `DetectionCandidate` (VO)
| Field | Type | Notes |
|-------|------|-------|
| `category` | `PiiCategory` | `PERSON, LOCATION, ORGANIZATION, EMAIL, PHONE, IBAN, PAYMENT_CARD, URL, IT_TAX_CODE, IT_VAT, ID_DOCUMENT, CONTEXTUAL_ID, VEHICLE_PLATE` |
| `range` | `CharRange` | Into `TextModel.text` |
| `confidence` | `ConfidenceLevel` | `high \| medium \| low` |
| `method` | `DetectionMethod` | `rule \| ner \| localLanguageModel` (the last is reserved, FR-011) |

Invariants:
- A range covers at least one non-whitespace character.
- A `rule` candidate whose format has a checksum is emitted only if the checksum is valid
  (FR-008).

#### `RedactionPlan` (VO; Review → Engine, Review → Verification)
| Field | Type | Notes |
|-------|------|-------|
| `areasByPage` | `Map<PageIndex, PlannedArea[]>` | |
| `redactedTexts` | `string[]` | Normalized, de-duplicated; used for side-channel scrubbing and verification |

#### `PlannedArea` (VO)
`box: BoundingBox`, `origin: text | area`. The origin selects the line-art mode:
text → fully covered, area → touched
([research R1](./research.md#r1-pdf-engine-for-true-irreversible-redaction-in-the-browser)).


---

## Bounded context: Document Ingestion

### `Document` (aggregate root)
| Field | Type | Notes |
|-------|------|-------|
| `id` | `DocumentId` | |
| `fileName` | `string` | Display only; never logged or sent (FR-027) |
| `byteSize` | `number` | ≤ 50 MB (52,428,800 bytes) — FR-003a |
| `pages` | `Page[]` | length ≥ 1 |
| `support` | `SupportStatus` | see state machine below |
| `textModel` | `TextModel` | Present only when `support` is `supported` or `partiallySupported` |

### `Page` (entity)
`index: PageIndex`, `size: {width, height}` (points, as displayed), `rotation: 0|90|180|270`,
`hasExtractableText: boolean`, `hasImages: boolean`.

### `TextModel` (VO)
The document's canonical text. Its character offsets are shared by detection, selection, and
redaction (Principle IV).
- `text: string`: the concatenated page texts, with `\n` between lines and `\f` between pages.
- `spans: TextSpan[]`: ordered, non-overlapping, and together covering all characters of
  `text` except the separators.
- Operations: `occurrencesOf(needle): CharRange[]` (uses the shared `TextNormalization`:
  NFKC, zero-width characters stripped, whitespace collapsed, case-folded; whole-word boundaries
  only, per FR-012a), `areasFor(range): PageArea[]` (merges character quads into one box per line and per
  page), `pageOf(range)`.

### `TextSpan` (VO)
`page: PageIndex`, `range: CharRange`, `line: number`, `charBoxes: BoundingBox[]`
(`charBoxes.length === range.end - range.start`).

### `SupportStatus` state machine

```text
          ┌──────────── tooLarge (> 50 MB, checked before parsing)
          ├──────────── notPdf / invalid
received ─┼──────────── passwordProtected
          ├──────────── imageOnly (no page has extractable text)
          ├──────────── partiallySupported (some pages have no text → listed as not checked)
          └──────────── supported
```
All states are terminal for a given `Document`. Only `supported` and `partiallySupported`
allow detection and export. Rectangle redaction is allowed on every page of those two states.
No state other than `supported` may be labelled "checked" (SC-008).

---

## Bounded context: Detection

`DetectionCandidate` and its vocabulary are in the shared kernel's published language (see above); the Detection context produces them.

### `Detector` (domain port)
`detect(text: TextModelView): Promise<DetectionCandidate[]>`. There is one implementation per
detector; the `DetectionPipeline` application service composes them and merges overlapping
candidates. When candidates overlap, the higher confidence wins; if the confidence is equal,
the longer span wins.

---

## Bounded context: Redaction Review

### `RedactionSet` (aggregate root, one per Document)
| Field | Type |
|-------|------|
| `documentId` | `DocumentId` |
| `redactions` | `Map<RedactionId, Redaction>` |

Commands (each keeps the invariants below):
- `addFromCandidates(candidates)`
- `addManualText(range)`
- `addManualArea(area)`
- `select(id)`, `deselect(id)`, `selectAll()`, `deselectAll()`
- `delete(id)` (manual redactions only)

Queries:
- `summary()` returns `{ total, automatic, manual, selected }` (FR-017).
- `toPlan()` returns a `RedactionPlan` (published language; see the shared kernel).

Invariants:
1. **One redaction per normalized text.** Adding a text whose normalized form already exists
   merges into the existing redaction. A manual addition upgrades the redaction's source to
   `manual` and its confidence to `userConfirmed`.
2. A text redaction's `occurrences` are **all** whole-word, case-insensitive occurrences of its
   normalized text in the `TextModel`, plus the user's own selection exactly as made (FR-012a).
3. `delete` is allowed only when `source` is `manual` (FR-015). Automatic items can only be
   deselected.
4. Area redactions never merge with each other.

### `Redaction` (entity)
| Field | Type | Notes |
|-------|------|-------|
| `id` | `RedactionId` | |
| `kind` | `text \| area` | |
| `text` | `string?` | Required for `text`, absent for `area` |
| `occurrences` | `Occurrence[]` | ≥ 1 |
| `category` | `PiiCategory \| 'MANUAL'` | |
| `source` | `automatic \| manual` | |
| `confidence` | `ConfidenceLevel \| 'userConfirmed'` | Must be `userConfirmed` if and only if `source = manual` |
| `selected` | `boolean` | Initial value (revised 2026-10-01): automatic high → `true`; automatic medium/low → `false`; manual → `true` |

### `Occurrence` (VO)
`range: CharRange?` (text redactions only) and `areas: PageArea[]` (≥ 1; one per line or page
fragment of the occurrence). A selection that crosses a page break becomes one occurrence with
areas on both pages.

### Lifecycle

```text
Redaction:  created(selected per rule) ⇄ selected/deselected  →  deleted (manual only)
RedactionSet: editing  →  exporting (read-only)  →  editing (after the verification result)
```

---

## Bounded context: Redaction Engine

Its input, `RedactionPlan`, is in the shared kernel's published language (see above).

### `ExportResult` (VO)
`output: Uint8Array` (the new PDF), `areasApplied: number`,
`sideChannelRemovals: SideChannelRemoval[]` (e.g., `{ channel: 'attachment', count: 1 }`).
There is no text payload.

---

## Bounded context: Verification

### `VerificationReport` (aggregate)
| Field | Type |
|-------|------|
| `itemsRemoved` | `number` (selected redactions in the plan) |
| `checks` | `VerificationCheck[]` |
| `outcome` | `verified \| failed` |

`VerificationCheck`: `{ kind, passed: boolean, failures: FailureLocator[] }`, where `kind` is one
of `validPdf`, `textAbsent`, `geometry`, `sideChannels`, `imagePixels`, or `singleRevision`
([research R5](./research.md#r5-verification-independence)).

`FailureLocator` holds `{ page?, redactionIndex? }`. It **never contains document text**, so the
report is safe to display and to log in aggregate.

Invariant: `outcome = verified` if and only if every check passed. Presentation MUST NOT offer
"safely redacted" wording unless `outcome = verified` (FR-026). A save after a failed
verification requires an explicit `UnverifiedSaveAcknowledgement` (FR-026a).

---

## Presentation-only state (not domain)

- `ViewerState`: current page, zoom, tool mode (`selectText` default | `drawArea`).
- `LanguagePreference`: `en | it`. It defaults to the browser language (Italian → `it`,
  otherwise `en`) and is the **only** thing stored on the device (FR-033).
