# Feature Specification: OscuraPDF

**Feature Branch**: `001-oscurapdf`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Build the product described in ../PRD.md (v0.2): a local-first browser application that detects, reviews, lets the user manually select, and permanently redacts sensitive information from PDFs entirely on the user's device, then verifies the removal."

## Guiding Principle

> **AI finds things. The user decides what gets removed. The application proves the removal worked.**

## Clarifications

### Session 2026-09-30

- Q: Which languages/jurisdictions must the MVP support? → A: Italy + English, plus generic EU/international formats (FR-006, FR-007).
- Q: Does redacting a manual selection cover only that occurrence? → A: No. Every occurrence of the same text is redacted automatically (FR-012a).
- Q: Can the user save after failed verification? → A: Yes, but only after explicitly acknowledging a prominent warning (FR-026a).
- Q: Should a text redaction also wipe content drawn in the same area (image pixels, drawn shapes)? → A: Yes. Every redaction, text or rectangle, removes all content inside its area (FR-022).
- Q: Should export always strip identifying document-level data (author, comments, attachments, etc.) that wasn't redacted? → A: No. Only the redacted content is removed wherever it appears; other document-level data is kept unchanged (FR-021, Assumptions).
- Q: What is the largest PDF the MVP must handle? → A: A hard limit of 50 MB file size, with no page-count limit (FR-003a).
- Q: Which language(s) should the application's interface use? → A: English and Italian, following the browser language, with a manual switch (FR-033).
- Q: (analysis follow-up) Should occurrence matching ignore letter case? → A: Yes. Matching ignores case and uses whole words only (FR-012a); verification uses the same rule.
- Q: How reliably must names, places, and organizations be detected? → A: Target ≥ 95% of person names and ≥ 85% of places/organizations. If that target cannot be reached, ≥ 85% of names and ≥ 70% of places/organizations is the accepted minimum, and the gap must be documented (SC-006a). *Places/organizations part superseded on 2026-10-01, see below.*

### Session 2026-10-01

- Q: (feedback after trying the app: random numbers, "USA" and word fragments such as "ttadinanza" were suggested) What should automatic detection prioritise? → A: Precision. Suggest only what we are sure of — at minimum tax codes (codice fiscale), first names, surnames, addresses, IBANs and identification codes in general — and nothing at random (FR-006, FR-007, FR-009a, SC-006b).
- Q: Which language should the interface use for now? → A: Italian only. The English copy and the language switch stay in the code for a future release but are not offered (FR-033).
- Q: How does the user fix a wrong selection, and leave a document? → A: Undo / redo with the platform shortcuts (Cmd+Z on macOS, Ctrl+Z on Windows) and buttons (FR-034); an X with a confirmation returns to the start page (FR-035).
- Q: (feedback: surnames are practically never recognised) How should surnames be found? → A: A surname after a courtesy or professional title (sig., dott.ssa, avv., Mr…) is always a person; names in capitals are recognised; a name part confirmed anywhere in the document (full name, or proposed in several places) is redacted wherever it appears, unless the same word is used as a common word in that document (FR-007).
- Q: (feedback) "Traversa", "Trav." and an address in capitals with a title (placeholder: "VIA MONS. ESEMPIO FITTIZIO, 10") are not recognised as addresses. → A: Street types and their abbreviations are recognised in any case (via, VIA, Trav., V.le, P.za, L.go, Fraz.…), with ordinals ("II Traversa") and a dash before CAP and city; words that are also ordinary words (corso, largo, strada…) only when capitalised; "via Email" is not a street (FR-006).
- Q: Can a black box be removed directly on the page? → A: Yes, an X appears on hover (FR-036).
- Q: (feedback) A rare surname written before the first name (placeholder example: "Fittizio Marilena") was not recognised. → A: Rare surnames written before or after a common Italian first name are recognised (first-name dictionary, ambiguous names excluded); a confident first name found by the model takes the adjacent surname along; role labels (Docente, Dipendente, Paziente, Cliente, Richiedente…) introduce a person; names never contain offices or company words (FR-007).
- Q: (2026-10-02) Some PDFs show readable text, but selecting it yields unrelated non-ASCII characters, selection jumps elsewhere and e-mails are not detected. If the text is not really selectable, why can it be selected? → A: Such text (broken character map) is detected line by line and treated as unreadable: excluded from detection and text selection, reported on the page list, outlined on the page; dragging over it creates an area redaction (FR-037). OCR of those zones is a later feature.
- Q: (2026-10-02) The start page must load instantly; heavy components must be downloaded only when a PDF is analysed, with a progress bar. → A: The start page downloads only itself (~120 KB); the PDF engine starts when a document is chosen, the analysis tools (AI runtime and model, ~160 MB, first time only) are prepared once the document is open, with a percentage shown; the app works offline after the first analysis (FR-029, SC-001).
- Q: Should long sequences of digits be covered? → A: Yes. Any run of 8 or more digits (spaces or hyphens allowed; not dates, amounts or decimals) is suggested as High (FR-006). *Revised below.*
- Q: (feedback) Very long numbers with many spaces are false positives, and "123123123 1" led to every "1" being blacked out. → A: Without a keyword only compact codes (8–16 digits, no spaces) are suggested; after a keyword ("codice cliente: …") the identifier is taken whole; a suggestion is always the whole string and is extended only to identical copies, never to its pieces; suggestions shorter than 3 characters are never made (FR-006).

### Session 2026-10-04

- Q: (owner request) Should websites, company names, public bodies and other institutions, number plates and health data be suggested automatically? → A: Yes (FR-007a). Evidence decides the confidence, as for everything else (FR-009a): websites, number plates, companies with a legal form ("Alfa Servizi S.r.l."), institutions with a head word and a proper name ("Comune di Bari", "Tribunale di Torino"), labelled clinical values ("Diagnosi: …") and conditions said of someone ("affetto da diabete") are High; organizations found only by the on-device model and conditions named without that context are Medium (shown, not preselected). When an organization overlaps personal data at equal confidence, the personal data is kept whole. This supersedes the 2026-10-01 answers where they say that organizations and URLs are not suggested.
- Q: (owner, after measuring on a public synthetic Italian PII dataset, 3,000 rows) Should an IBAN or VAT number with a wrong checksum still be recognised? And act numbers, cadastral data, medicines? → A: Yes: a valid format is enough (FR-008), and act and procedure numbers ("istanza n.", "determina n.", "Rep.", "RG", "CIG"), cadastral references ("Foglio 304, particella 3567") and medicines with a dose ("Metformina 850mg") are suggested (FR-007a). Also fixed after the measurement: a title after a role label or another title was proposed as a person ("Il richiedente Avv. …" → "Avv"); a card number was found inside an IBAN; cities of several words, "bis"/"ter" house numbers and cooperative legal forms were missed.
- Q: (owner) Should diagnoses and conditions be redacted? → A: No. Personal data is what identifies the person; the pathology must stay, so that, for example, an AI can read a clinical record and know the condition but not the patient. Health data is no longer suggested (the rules for clinical fields, conditions and medicines, and the HEALTH category, were removed); it is listed on the start page among what the user adds by hand. This supersedes the health parts of the two answers above.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manually redact selected text and export a verified PDF (Priority: P1)

A user opens a text-based PDF in the application. They highlight any text in the document preview (e.g., "ACME Holdings Ltd."), choose **Redact**, and the item appears in the redaction list with a visible redaction overlay. They click **Redact & Export**, and the application produces a new PDF from which that text is permanently removed. It then checks the new file and reports that the redacted content can no longer be found.

**Why this priority**: This is the smallest slice that delivers the core product promise: redacting a PDF without uploading it, with proof that the redaction worked. It works without any automatic detection, and the PRD requires that the user can always add arbitrary text to the redaction set.

**Independent Test**: Load a known text PDF, select one phrase on one page, export, then open the output in any standard PDF reader. The phrase cannot be found by search, cannot be selected or copied, and does not appear in extracted text. A black box sits where the phrase was.

**Acceptance Scenarios**:

1. **Given** the empty start screen, **When** the user drops a valid text-based PDF (or picks one via the file picker), **Then** the document preview appears along with the file name and file size.
2. **Given** a loaded PDF, **When** the user highlights text within a single line and chooses **Redact**, **Then** a redaction item is added to the list labelled as manually selected, and a redaction overlay covers exactly the highlighted text in the preview.
3. **Given** a loaded PDF, **When** the user highlights text spanning several words, several lines, or several separately-formatted runs of text, **Then** a single redaction item is created whose overlay covers every highlighted part and nothing outside it.
4. **Given** the selected phrase also appears elsewhere in the document, **When** the user chooses **Redact**, **Then** every occurrence is covered by the same item, the item shows the occurrence count, and every occurrence is overlaid in the preview.
5. **Given** one or more selected redactions, **When** the user clicks **Redact & Export**, **Then** a new PDF is produced, the original file is left unchanged, and a verification report is shown.
6. **Given** a successfully exported PDF, **When** the user opens it in a standard PDF reader, **Then** the redacted text cannot be found by search, cannot be selected or copied, is absent from extracted text, and each redacted area appears as a solid black rectangle.

---

### User Story 2 - Review automatically detected PII (Priority: P2)

After loading a PDF, the user sees a list of likely sensitive items the application found by itself: people's names, emails, phone numbers, bank account numbers (IBAN), payment card numbers, tax/government identifiers, addresses, birth/residence places, codes and long numbers. Each item shows its category and confidence. The user accepts or rejects each suggestion, adds anything the detector missed by selecting it, and exports as in Story 1.

**Why this priority**: Automatic detection makes the product much faster and helps users catch items they would overlook. It depends on the redaction and verification pipeline from Story 1, and it only assists the user, who stays in control.

**Independent Test**: Load a fixture PDF containing a known set of PII (e.g., "John Smith", "john@example.com", "+39 333 123 4567", "IT60X0542811101000000123456", "4111 1111 1111 1111"). Confirm each appears as a proposed redaction with the correct category, that nothing is applied until the user exports, and that rejected items remain in the output.

**Acceptance Scenarios**:

1. **Given** a text-based PDF is loaded, **When** processing completes, **Then** the application shows a summary (e.g., "23 potential sensitive items — 14 detected automatically, 9 manually selected") and a list of proposed redactions, each with its category and confidence level.
2. **Given** proposed redactions are listed, **When** the user clicks an item, **Then** the preview navigates to that item's page and highlights its location.
3. **Given** proposed redactions are listed, **When** the user deselects an item and exports, **Then** that item's content remains in the output PDF.
4. **Given** automatic and manual redactions both exist, **When** the user views the list, **Then** both kinds appear together in one list (optionally grouped by source) and support the same actions: select, deselect, navigate and export.
5. **Given** a Medium-confidence suggestion, **When** it is displayed, **Then** the UI clearly marks it as a suggestion, visually distinct from high-confidence items, and leaves it unselected.
6. **Given** any detection result, **When** the user has not yet exported, **Then** no content has been removed from any file. Detection alone never redacts anything.

---

### User Story 3 - Draw a rectangle redaction (Priority: P3)

Some content can't be selected as text: a signature, a logo, a photo, a stamp, or text in an unusual structure. The user switches from **Select text** mode to **Draw redaction** mode and drags a rectangle over the area. The rectangle joins the same redaction list and is permanently removed on export.

**Why this priority**: This fallback covers content that text selection cannot reach. It is valuable but needed less often than text redaction.

**Independent Test**: Load a PDF containing an embedded image (e.g., a signature). Draw a rectangle over it, export, and confirm that the output shows a black box, that no part of the original image is recoverable inside the box, and that any text previously under the box is gone.

**Acceptance Scenarios**:

1. **Given** a loaded PDF in the default **Select text** mode, **When** the user switches to **Draw redaction** and drags over an area, **Then** a rectangle redaction is added to the list and shown as an overlay.
2. **Given** a rectangle redaction over an image region, **When** the user exports, **Then** the image content inside the rectangle is destroyed in the output, not just covered.
3. **Given** a rectangle redaction over text, **When** the user exports, **Then** the text inside the rectangle is removed exactly as if it had been selected.
4. **Given** a manual rectangle or text redaction, **When** the user deletes it, **Then** it disappears from the list and the preview and does not affect the export.

---

### User Story 4 - Clear handling of unsupported or problematic files (Priority: P3)

A user drops a file the MVP cannot safely process: a non-PDF, a corrupt PDF, a password-protected PDF, or a scanned/image-only PDF. The application explains the problem in plain language and never implies that the document was checked for PII.

**Why this priority**: False reassurance would be the worst outcome for a privacy tool. Honest refusal protects users, but the refusal path is secondary to the core flow.

**Independent Test**: Drop each type of problematic file in turn and confirm that the correct message appears and that no "no PII found" or "safely redacted" state is shown.

**Acceptance Scenarios**:

1. **Given** the start screen, **When** the user drops a non-PDF or an invalid/corrupt PDF, **Then** the file is rejected with a clear message and the application returns to a ready state.
2. **Given** the start screen, **When** the user drops a PDF larger than 50 MB, **Then** it is refused before any processing, and the message states the 50 MB limit.
3. **Given** a password-protected PDF, **When** it is dropped, **Then** the application says that password-protected PDFs are not supported in this version.
4. **Given** a scanned or image-only PDF, **When** it is dropped, **Then** the application shows: "This PDF appears to be scanned or image-based. Automatic text redaction is not currently supported." It does not say the document was checked for PII.
5. **Given** a PDF where only some pages contain no extractable text, **When** it is processed, **Then** the application names those pages as not automatically checked, and the user can still use rectangle redaction on them.

---

### Edge Cases

- **Same text appears more than once**: A manually selected phrase (e.g., a company name) appears on several pages. Every occurrence in the document is redacted automatically, and the list shows how many occurrences are covered (see FR-012a). Verification then fails if any occurrence remains.
- **Text that looks fine but reads as garbage**: The PDF draws readable text but its character map is broken, so the extracted characters are unrelated symbols. Those lines are unreadable (FR-037): they are not used for detection, cannot be selected as text, are outlined on the page, and can be redacted by dragging over them. Encodings that map to other plain letters (a shifted alphabet) cannot be told apart from real text and stay readable.
- **Selection crosses pages**: A text selection that runs across a page boundary becomes one redaction item per page, or the user is asked to select within a single page.
- **Overlapping items**: An automatic detection and a manual selection cover the same or overlapping text. The overlap is merged or shown once so the list doesn't double-count, and removal is still complete.
- **Selection includes whitespace or partial words**: Only the highlighted characters are redacted. Neighbouring characters of a partially selected word are kept.
- **Rotated pages, unusual fonts, ligatures, or text drawn character by character**: Overlays and removal still line up with the visible text. If precise mapping fails, the user is told and pointed to the rectangle tool.
- **Text shown both as a picture and as hidden text** (e.g., a scanned page with a recognized-text layer): Redacting the text also destroys the image pixels in the same area, so the value can't be read from the picture (see FR-022).
- **Redacted text also appears in document properties, bookmarks, annotations/comments, or form fields**: It must not survive in the output through those channels (see FR-021).
- **Verification finds leftover content**: Handled as a failed verification (see FR-025, FR-026). The user can save only after acknowledging a warning (FR-026a).
- **Very large documents** (up to 50 MB, any number of pages): The interface stays responsive and shows progress. Performance targets apply to typical 10-page documents only. Files over 50 MB are refused (FR-003a).
- **User loads a second PDF while one is open**: The current document, its redactions, and any sensitive data held for it are discarded after confirmation.
- **No redactions selected**: **Redact & Export** is disabled or explains that nothing is selected.

## Requirements *(mandatory)*

### Functional Requirements

**Document input**

- **FR-001**: The system MUST let the user open a single PDF at a time, via drag-and-drop or a file picker.
- **FR-002**: The system MUST show a preview of the loaded PDF, its file name, and its file size.
- **FR-003**: The system MUST reject non-PDF files and invalid or corrupt PDFs with a plain-language message.
- **FR-003a**: The system MUST refuse files larger than 50 MB before processing, with a clear message stating the limit. There is no page-count limit. Any PDF of 50 MB or less MUST be accepted regardless of page count.
- **FR-004**: The system MUST detect password-protected PDFs and tell the user they are not supported in this version.
- **FR-005**: The system MUST detect PDFs (or individual pages) that have no extractable text, tell the user that automatic detection is not available for them, and never state or imply that such content was checked for PII.

**Automatic detection**

- **FR-006**: The system MUST automatically detect, using pattern and validity checks: email addresses, phone numbers, payment card numbers, IBANs, common tax and government identifiers, street addresses with a house number, values of labelled form fields (e.g., "Cognome", "Nome", "Luogo di nascita", "Residente a"), identifiers introduced by a keyword (e.g., "Codice cliente:", "Pratica n.", "Fattura n.", "POD", "Customer ID"), taken whole even when written in digit groups (up to 20 digits), and compact codes of 8–16 digits without spaces (dashes allowed). Long digit runs spread over spaces are not suggested without a keyword. Automatic suggestions are never shorter than 3 characters, since each one covers every occurrence of its text. The MVP covers Italian formats (e.g., Italian tax code / codice fiscale, Italian VAT number / partita IVA, Italian phone numbers) and internationally standard formats (IBAN, payment cards, email, international phone numbers). Formats that are ambiguous on their own (Italian phone numbers, VAT numbers, document numbers) are reported only next to a keyword. Web addresses are not detected automatically (clarification 2026-10-01).
- **FR-007**: The system MUST automatically detect people's names in document text written in Italian or English, as whole capitalised words and never form labels (e.g., "Cognome", "Cittadinanza"), greetings ("Gentile") or company names ("… S.r.l."). A name after a courtesy or professional title ("sig. Rossi", "dott.ssa Greco", "Mr Smith") or a role label ("Docente:", "il dipendente …") is High; a capitalised word next to a common Italian first name is a surname ("Fittizio Marilena", "Inventato Rosaria"), except places, institutions and words that only start a sentence; names written in capitals ("ROSSI MARIO") are recognised; a first name or surname confirmed in the document is redacted wherever it appears alone, unless the same word also appears as a common lower-case word in that document. Places are suggested only as addresses or labelled birth/residence places (FR-006); place names on their own (e.g., "USA") are not suggested (clarification 2026-10-01). A company name is never a person; organizations have their own requirement (FR-007a).
- **FR-007a** (clarification 2026-10-04): The system MUST automatically detect, in Italian and English text: websites and links (with "http", "www", or a bare domain with a common top-level domain; never a part of an email address); vehicle number plates (the current Italian format anywhere when written in capitals, any other format after a keyword such as "targa" or "plate number"); companies named with a legal form ("S.r.l.", "S.p.A.", "Ltd", "GmbH"…) and institutions named with a head word and a proper name ("Comune di …", "Tribunale di …", "Ospedale …", "Università …", "Banca …"), never a head word followed by a form label ("Comune di residenza"); other organization names found by the on-device model, as Medium; cadastral references (sheet and parcel, with the unit); and the numbers of acts and procedures after their keyword, never of laws and decrees ("legge n. 241/1990"). The health-card number after "tessera sanitaria" is covered as an identifier (FR-006). Clinical content (diagnoses, conditions, medicines, prognoses) MUST NOT be suggested (third answer of 2026-10-04): the app removes who a document is about, not what it says; the user can still redact any of it by hand.
- **FR-008**: The system MUST apply validity checks (e.g., checksums) where a format defines them. A value that passes its check is High. A value with the right shape but a wrong check is still suggested (clarification 2026-10-04, second answer): as High when the text itself says what it is ("IBAN …", "C.F. …", "P.IVA …" right before the number, "carta di credito …"), otherwise as Medium for IBANs and tax codes, whose shape is distinctive, and not at all for cards and VAT numbers, which are plain digits.
- **FR-009**: The system MUST assign each automatic detection a category (e.g., PERSON, EMAIL, PHONE, IBAN) and a confidence level: High, Medium or Low.
- **FR-009a**: Precision first (clarification 2026-10-01): Low-confidence detections MUST NOT be shown; only High-confidence detections are selected by default; Medium-confidence detections are shown unselected. When two detections cover the same text with equal confidence and length, the specific category wins over the generic identifier.
- **FR-010**: The system MUST NOT remove any content based on automatic detection alone. Content is only removed when the user exports with that item selected.
- **FR-011**: The detection design MUST allow an optional additional on-device assessment step for ambiguous candidates to be added later, without changing the review or redaction flow. This step is not required for the MVP.

**Manual redaction**

- **FR-012**: Users MUST be able to select arbitrary text in the document preview and add it to the redaction list with a single **Redact** action shown next to the selection.
- **FR-012a**: When the user redacts selected text, the system MUST automatically include every other occurrence of the same text in the document in that redaction and show how many occurrences are covered. Deselecting or deleting the item applies to all of its occurrences. Occurrences are matched after the shared text normalization (Unicode NFKC, zero-width characters removed, whitespace and line breaks collapsed), ignoring letter case, and only on whole-word boundaries. The user's own selection is always redacted exactly as selected, even if it is a partial word.
- **FR-013**: Text selections MUST be supported when they span multiple words, multiple lines, and multiple separately-formatted runs of text on a page. The redaction covers exactly the selected characters.
- **FR-014**: Users MUST be able to switch between **Select text** mode (the default) and **Draw redaction** mode, and draw rectangular redaction areas on any page.
- **FR-015**: Users MUST be able to delete any manual redaction.

**Unified review**

- **FR-016**: Automatic and manual redactions MUST appear in one redaction list and MUST be handled the same way by review, export and verification.
- **FR-017**: The review list MUST show a summary count (total, automatically detected, manually added), each item's text (or "Area, page N" for rectangles), its category or "MANUAL" label, and its source. Automatic items also show their confidence.
- **FR-018**: Users MUST be able to select or deselect each item individually, and select all or deselect all.
- **FR-019**: Clicking an item in the list MUST navigate the preview to the item's page and location.
- **FR-020**: Every selected redaction MUST be shown as an overlay in the preview before export.

**Redaction & export**

- **FR-021**: On export, the system MUST produce a new PDF from which every selected item's content is permanently removed. The content must not be recoverable through text selection, copy/paste, search, text extraction, or inspection of the document's internal content, including any copies of that text in document properties, bookmarks, annotations/comments, form-field values, attachments, or earlier saved revisions of the file. Document-level data that does not contain redacted content is kept unchanged.
- **FR-022**: For every redaction, text or rectangle, the system MUST remove all content inside the redaction's area(s): text, image pixels (destroyed, not covered), and drawn shapes. This also covers text that is shown as an image with a hidden text layer (e.g., scanned documents with recognized text). Content outside the areas MUST be preserved, except that vector strokes touched by a rectangle redaction are removed entirely, so that a partly covered signature or stamp cannot leak.
- **FR-023**: Each redacted area MUST appear in the output as a solid black rectangle. No appearance settings are required.
- **FR-024**: The original file on the user's device MUST NOT be modified. The output is a separate file the user saves.

**Verification**

- **FR-025**: After producing the output, the system MUST automatically reopen it, extract its text, confirm that none of the selected redacted content is present, and confirm that the output is a valid, openable PDF.
- **FR-026**: The system MUST report the verification result, including the number of items removed and whether each check passed. When every check passes, a one-line summary is shown and the per-check list is collapsed, one click away (clarification 2026-10-02); failed checks are always listed. If any check fails, the system MUST state clearly that the redaction could not be verified and MUST NOT describe the document as safely redacted.
- **FR-026a**: When verification fails, the user MAY still save the output, but only after explicitly acknowledging a prominent warning that the redaction is unverified. The default action is not to save, and a failed output is never offered without that acknowledgement.

**Privacy & data handling**

- **FR-027**: The system MUST NOT transmit the PDF, any extracted text, any detected values, or file names to any server, third-party service or remote AI provider.
- **FR-028**: All document processing, including detection, redaction and verification, MUST happen on the user's device.
- **FR-029**: Once the application and its detection assets have been obtained (they are obtained on the first analysis, not when the start page loads), the system MUST be able to process documents with no network connection. The start page MUST NOT download the PDF engine, the analysis runtime or the models.
- **FR-030**: The system MUST NOT record document content, extracted text or detected values in logs, error reports, analytics, web addresses, or persistent browser storage.
- **FR-031**: The system MUST release its in-memory copies of document data when the user closes or replaces the document, where practical.

**Responsiveness**

- **FR-032**: The interface MUST stay responsive (scrolling, selection, and cancelling are possible) and show progress while a document is being processed, exported or verified.

**Localization**

- **FR-033**: The interface MUST be in Italian, including every label, message, warning, and verification report, whatever the browser language (clarification 2026-10-01). English copy is maintained with the same keys so it can be offered again later; when more than one language is offered, the UI defaults to the stored preference, then the browser's language, shows a manual switch, and switching MUST NOT discard the loaded document or its redactions. The language setting is stored on the device and never sent anywhere.
- **FR-034**: The user MUST be able to undo and redo their review actions (adding a text or area redaction, selecting, deselecting, select/deselect all, removing) with Cmd+Z / Shift+Cmd+Z on macOS and Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y on Windows and Linux, and with visible Undo / Redo buttons. "Select all" and "Deselect all" are one step each. Automatic detections are not user actions: undo never removes them, and an item changed by detection after the user's action is left as it is. Undo is unavailable while exporting; text fields keep their native undo (clarification 2026-10-01).
- **FR-035**: While reviewing, a close control (X) and the application logo MUST let the user leave the document. It asks for confirmation (keeping the document is the default; Esc cancels); on confirmation the document and all its data are released (FR-031) and the start page is shown, ready for the next document.
- **FR-036**: In select mode, hovering a black box on the page MUST show an X that takes that item out of the redaction without looking for it in the list: an automatic suggestion is deselected (it stays in the list), a manual item is removed. The X acts on the whole item (all its occurrences, FR-012a) and says so; it is undoable (FR-034). Keyboard users have the same actions in the list.
- **FR-037**: Text whose characters do not match what the page shows (a PDF with a broken or missing character map: the extracted characters are control codes, private-use or unrelated symbols) MUST be treated as unreadable, line by line: it is not used for automatic detection and cannot be selected as text; the page is reported as "text not readable automatically" (never as checked, like FR-005); its zones are outlined on the page, and dragging over a zone in select mode creates an area redaction exactly where the user dragged. Readable lines keep normal behaviour, including lines with a few symbols or icons (clarification 2026-10-02).

### Key Entities

- **Document**: The PDF the user loaded. Attributes: file name, size, page count, per-page text availability, and whether it is supported (supported / password-protected / image-only / invalid).
- **Text Span**: A piece of extracted text with its page and on-page position. It links what the user sees and selects to the underlying document content.
- **Redaction**: One item to be removed. Attributes: text (or none for rectangle areas), its occurrences (each with a page and one or more on-page areas), category (a PII type or MANUAL), source (automatic or manual), confidence (automatic only; manual items count as user-confirmed), and selected state. Every detection path and every manual action produces this one entity.
- **Detection Candidate**: An automatic finding before it becomes a Redaction. Attributes: category, text, location, confidence, and which detection method found it.
- **Verification Report**: The result of checking the output. Attributes: items removed, check results (content absent, output valid), and overall pass or fail.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a typical 10-page text-based PDF on a modern desktop computer, reviewable detections appear within 10 seconds of the user dropping the file. This is measured with the detection models already stored on the device. The first run shows model-download progress and is excluded from this target.
- **SC-002**: For the same typical document, export plus verification finishes within 5 seconds.
- **SC-003**: In 100% of verified exports, no selected redacted text can be found in the output through search, copy/paste, or text extraction in at least two independent, widely used PDF readers.
- **SC-004**: During a full session (load, detect, review, export, verify), zero bytes of document content, extracted text, detected values, or file names leave the device, as confirmed by monitoring network traffic.
- **SC-005**: With the network disconnected after the application has loaded, the full workflow completes successfully.
- **SC-006**: On a reference test set of documents with labelled PII, at least 95% of well-formed emails, IBANs, and payment card numbers are detected as High confidence.
- **SC-006a**: Detection of person names is measured on a reference test set of Italian and English documents with labelled entities. An entity counts as found if it is proposed as a redaction at any confidence level. There are two tiers (the places/organizations part was withdrawn on 2026-10-01, since those are no longer suggested on their own):
  - **Target (aim for this):** at least **95%** of person names are found.
  - **Accepted minimum (the release bar):** at least **85%** of person names are found. Reaching this is enough to release the MVP.
  - If the result is below the target but at or above the minimum, the measured figures and the reason the target was missed (e.g., model size versus the SC-001 time budget) MUST be recorded in the plan and evaluation report (`ner-eval-report.md`). A result below the minimum fails this criterion.
- **SC-006b**: On a reference set of realistic Italian and English documents (ID card, contract, invoice, letter, data sheet, and a document with no personal data) with the personal data marked, at least **95%** of the suggestions selected by default are personal data. Below that, the release fails regardless of SC-006a.
- **SC-007**: A first-time user can manually redact a chosen phrase and export a verified PDF in under 2 minutes without instructions.
- **SC-008**: No image-only, password-protected, or invalid document is ever shown with a "checked" or "safely redacted" status.
- **SC-009**: The interface never becomes unresponsive for more than 200 ms at a time during processing of a typical document.

## Assumptions

- **Target platform**: Current versions of mainstream desktop browsers on modern desktop hardware. Mobile and tablet use is out of scope for the MVP.
- **Text-based PDFs only**: Scanned or image-only content is detected and flagged, but local OCR is out of scope for the MVP.
- **Password-protected PDFs**: Detected and refused. Unlocking them is out of scope for the MVP.
- **Optional on-device language-model step**: Out of scope for the MVP. Only the extension point (FR-011) is required.
- **Default selection state** (revised 2026-10-01): only High-confidence detections are selected by default; Medium ones are shown unselected and Low ones are not shown. The user must still click **Redact & Export**, so nothing is removed without confirmation.
- **Dates**: Not treated as sensitive by default, because the MVP has no settings to enable it.
- **Document-level data**: Properties (e.g., author), comments, attachments and other document-level data are not stripped wholesale in the MVP. Only redacted content inside them is removed. Users are responsible for any identifying data they did not select.
- **Redaction appearance**: A black rectangle only. Labels such as "REDACTED" and other colours come in a future version.
- **Detection assets**: Downloaded once with the application from the application's own host, never loaded or sent at document-processing time. Offline use starts after that first load.
- **Single document, single session**: No project saving, batch processing, history or accounts in the MVP. Closing the application discards all state.
- **Output file name**: A neutral default derived locally (e.g., the original name with a "-redacted" suffix). It is never sent anywhere.
- **Detection quality**: Automatic detection is an aid and will miss some items. The user is responsible for reviewing the document, and the UI says so.
- **Source document**: This specification is based on PRD v0.2 (`../PRD.md`), which ends partway through Section 27 (Initial User Interface). Only the empty state is described there, so the rest of the screen design is left to planning.
