# Contract: User Interface States and Messages

The UI is the product's only external interface. The states, actions and message keys below are
the contract that the e2e tests assert. All copy exists in **EN and IT** (FR-033). Keys are
typed, so a missing translation is a compile error.

## Screen states

| State | Entered when | Must show | Must NOT show |
|-------|--------------|-----------|---------------|
| `empty` | App start / after close | Title, "Your document never leaves this device", drop zone, file picker | — |
| `loading` | File accepted | Progress (read → extract), Cancel | — |
| `rejected` | `notPdf`, `invalid`, `tooLarge`, `passwordProtected` | Reason-specific message (`tooLarge` states **50 MB**) and a way back to `empty` | Any "checked" wording |
| `imageOnly` | No extractable text | Message: *"This PDF appears to be scanned or image-based. Automatic text redaction is not currently supported."* | "Checked", "No PII found" |
| `reviewing` | Document loaded | Detection status (runs in the background: patterns → names/places/organizations; a "downloading detection models" stage with progress on first use; a notice if NER is unavailable); preview; tool switch `[Select text] [Draw redaction]` (default Select text); redaction list with summary; Select all / Deselect all; **Redact & Export** (disabled if nothing is selected); "not checked" banner listing pages without text (partial support) and, separately, pages with unreadable text (FR-037); unreadable zones outlined with a dashed border in select mode, dragging over one adds an area redaction | — |
| `exporting` | Redact & Export clicked | Progress (redact → verify); the list is read-only | — |
| `verified` | Report outcome `verified` | "Redaction complete", N items removed, each check ✓, **Save** | — |
| `verificationFailed` | Report outcome `failed` | *"We could not verify this redaction. The document was not marked as safely redacted."*, failed checks (page numbers only), **Back to review** (default focus), **Save anyway…** | "Complete", "Safe", ✓ overall |
| `acknowledgeUnverified` | "Save anyway…" | Warning; a checkbox "I understand this file may still contain the redacted information"; **Save** (enabled only when checked); Cancel (default) | — |

## Redaction list item

| Element | Content |
|---------|---------|
| Checkbox | Selected state |
| Label | The text (truncated), or "Area, page N" for area redactions |
| Badge | Category (PERSON, EMAIL, …) or MANUAL |
| Confidence | High / Medium for automatic items (Low is never shown). Medium items are styled as "Suggestion" and start unselected. |
| Occurrences | "×N" when N > 1 (FR-012a) |
| Click | Navigates to and highlights the first occurrence; repeated clicks cycle through occurrences |
| Delete | Only on manual items |

## Interactions

- **Text selection → Redact**: a contextual button appears next to a non-empty selection.
  Pressing Enter while the button has focus triggers it.
- **Draw mode**: a pointer drag creates an area, a drag shorter than 4 pt is ignored, and Esc
  cancels.
- **Replacing a document** while in `reviewing` asks for confirmation, then returns to `empty`
  and releases all document data.
- **Logo** (header): a link to the start page; with a document open it asks the same confirmation as the X; on the start page it scrolls to the top; from an error screen it goes straight back.
- **Tool switch**: "Seleziona testo" / "Seleziona area" (renamed from "Disegna oscuramento", 2026-10-02).
- **Black boxes on the page** (select mode): hovering one highlights it and shows an **X** (tooltip: "Non oscurare «…» (rimane tra i suggerimenti)" for automatic items, "Rimuovi «…»" for manual ones, mentioning all occurrences when there are several). Pointer only; the list offers the same actions to keyboard users (FR-036).
- **Review toolbar** (top of the panel): file name and size; **Undo** / **Redo** buttons (disabled when there is nothing to undo or redo; tooltips show ⌘Z / ⇧⌘Z on Apple devices, Ctrl+Z / Ctrl+Y elsewhere); **X** (Close document) → confirmation dialog "Close this document?" with **Keep working** (default, Esc) and **Close document** → `empty` (FR-034, FR-035).
- **Language switch** is shown only when more than one UI language is offered (currently Italian only, 2026-10-01); switching does not reset the document or its redactions.
- **Output file name**: `<original-stem>-redacted.pdf`, derived locally.
