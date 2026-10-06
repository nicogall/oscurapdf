# OscuraPDF Constitution

## Core Principles

### I. Local-Only Processing (NON-NEGOTIABLE)

The user's document never leaves their device.

- PDF bytes, extracted text, detected values, and file names MUST NOT be transmitted to any
  server, third-party service, or remote AI provider, for any purpose.
- All parsing, detection (rules, NER, and any future language model), redaction, and
  verification MUST execute on the user's device.
- The application MUST remain fully functional offline once its code and model assets are loaded.
- Application code and model assets MUST be served from the application's own origin (or bundled);
  the app MUST NOT fetch code or models from third parties at document-processing time.
- Sensitive data MUST NOT be written to logs, analytics, error reporting, URLs, or persistent
  browser storage. Processing is in-memory; references and temporary object URLs are released
  when a document is closed or replaced.

Rationale: "Your document never leaves this device" is the product's core promise. One leak
breaks that promise completely, and the user cannot detect or undo it.

### II. Irreversible, Verified Redaction (NON-NEGOTIABLE)

A redaction removes content; drawing a box over it is not enough.

- Exported PDFs MUST NOT expose redacted content through text selection, copy/paste, search,
  text extraction, inspection of content objects, metadata, bookmarks, annotations, or form fields.
- Image content under a rectangle redaction MUST be destroyed, not only covered.
- Every export MUST be re-parsed and verified automatically (redacted content absent; output is a
  valid PDF) before it is described as redacted.
- The application MUST NOT call a document "redacted", "safe", or "checked" unless
  that claim has been verified. Unverified outputs, image-only pages, and unsupported files MUST
  be labelled honestly.
- The original file MUST NOT be modified.

Rationale: an overlay with the text still underneath is worse than no redaction, because it
gives false confidence. Verification is the product's evidence that the removal worked.

### III. User Authority Over Automation

Automation suggests; the user decides.

- Automatic detection MUST NOT remove content on its own; only an explicit user export
  action removes content.
- The user MUST always be able to redact arbitrary selected text and draw rectangle
  redactions, independently of whether any detector ran or succeeded.
- The user MUST be able to accept, reject, add, and delete any redaction, and select or deselect
  all redactions.
- Automatic results MUST show their confidence and be presented as suggestions.
- Detection layers MUST fail gracefully: if a model is unavailable or fails, manual redaction,
  export, and verification continue to work.

Rationale: detectors miss some items and flag others wrongly. The user is responsible for the
document, so the tool must never override or block the user's judgement.

### IV. One Redaction Model

Every source of redactions produces the same redaction object, and that object flows
through one pipeline.

- Rule detectors, NER, any future on-device language model, text selection, and rectangle drawing
  MUST all produce the same redaction entity (text, occurrences with page and bounding boxes,
  type, source, optional confidence, selected state).
- Review, export, and verification MUST NOT branch on how a redaction was created.
- New detection layers MUST plug in as producers of this model without changing review, export,
  or verification.
- Detection MUST run on extracted text with coordinates, never on the raw PDF binary, and large
  models MUST be applied to candidate spans rather than the whole document.

Rationale: separate "manual" and "AI" code paths drift apart, and each divergence is a potential
leak. One model keeps the guarantees in Principle II uniform.

### V. Test Coverage & Test-Backed Safety (NON-NEGOTIABLE)

All code MUST have tests, and every safety guarantee in this constitution MUST have an
automated test.

- Every unit of production code MUST ship with automated tests in the same change; untested
  code MUST NOT be merged.
- Coverage thresholds, enforced by CI (a build fails below them):
  - Domain layer of every bounded context (see Principle VI): ≥ 95% line and ≥ 90% branch.
  - Application and infrastructure layers: ≥ 85% line and ≥ 80% branch.
  - Coverage MUST NOT decrease by more than 0.25 percentage points against the committed baseline;
    excluding code from coverage requires a written justification in the code and in the plan's
    Complexity Tracking section.
- Test pyramid: domain logic is unit-tested without the PDF library, ML runtime, UI framework,
  or browser; adapters have their own integration tests; critical user journeys have
  end-to-end tests.
- Redaction and verification MUST be tested with a fixture corpus of PDFs that covers:
  multi-line and multi-span selections, repeated occurrences, rotated pages, embedded fonts and
  ligatures, images, metadata, annotations, and form fields.
- Each fixed leak MUST first be reproduced by a failing regression test, which is then kept.
- Rule-based detectors (email, phone, IBAN, cards, Italian tax/VAT codes, URLs) MUST have
  unit tests covering valid, invalid-checksum, and near-miss inputs.
- A privacy test MUST confirm that no network requests carry document-derived data during a
  full load → detect → export → verify session.
- Test fixtures MUST contain only synthetic data, never real personal data.

Rationale: the product sells guarantees. Any guarantee without a test is an assumption, and an
assumption about leaks will eventually fail. High coverage of the domain keeps the core rules
provably correct as the code changes.

### VI. Domain-Driven, Modular Architecture

The code is organised around the problem domain, split into bounded contexts with
explicit boundaries between them.

- Bounded contexts (each its own module, with its own domain model and public API):
  - **Document Ingestion**: loading, validating, and classifying PDFs; the text-with-coordinates
    model (Document, Page, Text Span).
  - **Detection**: rule detectors, NER, and optional language-model layers producing Detection
    Candidates.
  - **Redaction Review**: the Redaction set, including occurrences, selection state, user
    decisions, and merging overlapping items.
  - **Redaction Engine**: removing the selected content and writing the output PDF.
  - **Verification**: re-parsing the output and producing a Verification Report.
  - **Presentation**: the UI shell, viewer, and review screens. It holds no domain logic.
- Ubiquitous language: code, specs, and UI copy MUST use the domain terms (Document, Text Span,
  Occurrence, Detection Candidate, Redaction, Verification Report). Synonyms for the same
  concept are not allowed.
- Layering inside each context: **domain** (entities, value objects, domain services;
  pure, framework-free) ← **application** (use cases that orchestrate the domain) ←
  **infrastructure** (adapters for the PDF library, ML runtime, workers, and browser APIs).
  Dependencies point inward only. The domain MUST NOT import infrastructure or UI frameworks.
- External technology is reached only through ports (interfaces) owned by the domain or
  application layer. Adapters implement these ports and can be replaced without changing
  the domain.
- A context may use another context only through that context's public API, never through its
  internal files. Cyclic dependencies between modules are not allowed.
- Value objects are immutable. Invariants (e.g., a bounding box lies within its page; a manual
  Redaction has no confidence value) are enforced in the domain model, not in UI code.
- Module boundaries and dependency direction MUST be enforced automatically (lint or
  architecture tests) in CI.

Rationale: the privacy and redaction guarantees live in the domain. Isolating them from
libraries and UI makes them testable, reviewable, and safe to change. Clear contexts stop
code from turning into a tangle.

### VII. Clean Code, No God Objects (NON-NEGOTIABLE)

Unrelated responsibilities MUST NEVER be combined in the same class, module, or function.

- Single Responsibility: each class, module, and function has exactly one reason to change.
  A unit whose purpose cannot be described in one sentence without "and" must be split.
- God classes, god modules, god functions, and "utils"/"helpers"/"manager"/"misc" collections
  of unrelated code are not allowed.
- Enforced limits (lint, CI-blocking):
  - Function/method: ≤ 40 lines, ≤ 4 parameters (use a parameter object beyond that),
    cyclomatic complexity ≤ 10, nesting depth ≤ 3.
  - Class/module file: ≤ 300 lines; a class exposes ≤ 10 public methods.
  - A limit may be exceeded only with an inline justification approved in code review and
    recorded in Complexity Tracking; "it was faster" is never a valid justification.
- Intent-revealing names in the ubiquitous language; no abbreviations or meaningless names
  (`data`, `tmp`, `obj`, `handle2`).
- Functions do one thing at one level of abstraction; commands and queries are separate; no
  hidden side effects; no boolean flag arguments that switch behaviour.
- Depend on abstractions (Dependency Inversion); prefer composition over inheritance; no
  duplicated logic (DRY), but no speculative abstraction either (YAGNI).
- Errors are explicit, typed, and handled at the right layer; they are never silently
  swallowed. Error messages MUST NOT contain document data (Principle I).
- Comments explain *why*, not *what*; dead code and commented-out code are deleted.
- Leave code cleaner than you found it: refactoring within a change's scope is expected, and it
  must keep tests green and coverage intact.

Rationale: god objects hide coupling, block testing, and make leak paths hard to find in
review. Small, focused units keep each safety guarantee visible and verifiable.

## Privacy & Security Constraints

- The product is a static, client-side browser application with **no backend** that receives
  document data. Adding any server component that handles document data requires a MAJOR
  constitution amendment.
- Heavy work (PDF parsing, model inference, export, verification) MUST run off the UI thread so
  the interface remains responsive; target <10 s from drop to reviewable detections for a
  typical 10-page document on modern desktop hardware.
- WebGPU MAY be used as an acceleration path, but a CPU/WASM fallback MUST exist.
- Third-party dependencies MUST be pinned to exact versions and reviewed for network behaviour
  before adoption; any dependency that phones home is disallowed or must be neutralised.
- Scanned/image-only content is out of scope until local OCR exists; such content MUST be
  flagged, never silently treated as checked.

## Development Workflow & Quality Gates

- Every feature follows the Spec Kit flow: specify → (clarify) → plan → tasks → implement. Each
  plan MUST include a Constitution Check against Principles I–VII, and each plan's project
  structure MUST map directly to the bounded contexts in Principle VI.
- A change touching extraction, coordinate mapping, redaction, export, or verification MUST NOT
  merge unless the full redaction fixture suite and the privacy test pass.
- CI gates (all blocking): tests pass; coverage thresholds (Principle V) met and not decreased;
  clean-code limits (Principle VII) pass lint; architecture/dependency rules (Principle VI)
  pass; privacy test passes.
- Task lists MUST include test tasks for every implementation task; tests are not optional.
- Code review MUST explicitly confirm: no new network egress, no logging of document data,
  no new code path that bypasses the one redaction model, no boundary violations between
  bounded contexts, and no god classes or functions.
- Keep the design simple: add no abstraction, dependency, or detection layer unless a spec
  requirement needs it. Any exception MUST be recorded in the plan's Complexity Tracking
  section.

## Governance

- This constitution overrides conflicting practices, plans, and specs. Where a spec conflicts
  with it, the spec is amended, not the principle, unless a constitution amendment is made first.
- Amendments are made by updating this file with a Sync Impact Report, a rationale, and a
  version bump, and by reconciling affected specs and plans.
- Versioning (semantic):
  - MAJOR: removing or redefining a principle, or weakening a NON-NEGOTIABLE guarantee.
  - MINOR: adding a principle or section, or materially expanding guidance.
  - PATCH: clarifications and wording fixes with no change in meaning.
- Compliance: each `/speckit-plan` Constitution Check and each code review verifies adherence;
  any justified deviation is recorded in the plan's Complexity Tracking section.

**Version**: 2.0.0 | **Ratified**: 2026-09-30 | **Last Amended**: 2026-10-06
