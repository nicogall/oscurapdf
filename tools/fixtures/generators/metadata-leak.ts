import * as mupdf from 'mupdf';
import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';
import { A4, drawLines, type Fixture } from '../fixture';

export const LEAK_NAME = 'Mario Rossi';
const PRODUCER = 'Synthetic Fixture Producer';

const XMP = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:creator><rdf:Seq><rdf:li>${LEAK_NAME}</rdf:li></rdf:Seq></dc:creator>
</rdf:Description></rdf:RDF></x:xmpmeta>
<?xpacket end="w"?>`;

const addOutline = (doc: PDFDocument): void => {
  const context = doc.context;
  const outlinesRef = context.nextRef();
  const itemRef = context.nextRef();
  const pageRef = doc.getPage(0).ref;
  context.assign(
    itemRef,
    context.obj({ Title: PDFString.of(`Notes on ${LEAK_NAME}`), Parent: outlinesRef, Dest: [pageRef, 'Fit'] }),
  );
  context.assign(outlinesRef, context.obj({ Type: 'Outlines', First: itemRef, Last: itemRef, Count: 1 }));
  doc.catalog.set(PDFName.of('Outlines'), outlinesRef);
};

const addComment = (doc: PDFDocument): void => {
  const annotation = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Text',
    Rect: [400, 700, 420, 720],
    Contents: PDFString.of(`Call ${LEAK_NAME} tomorrow`),
    T: PDFString.of('Reviewer'),
  });
  doc.getPage(0).node.addAnnot(doc.context.register(annotation));
};

const addFormField = (doc: PDFDocument): void => {
  const field = doc.getForm().createTextField('patient.name');
  field.setText(LEAK_NAME);
  field.addToPage(doc.getPage(0), { x: 50, y: 500, width: 200, height: 20 });
};

const buildBase = async (): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  drawLines(doc.addPage([A4.width, A4.height]), font, [`Patient: ${LEAK_NAME}, file 2024/17.`, 'Unrelated clause text.']);
  doc.setAuthor(LEAK_NAME);
  doc.setTitle(`Record of ${LEAK_NAME}`);
  doc.setSubject('Synthetic record');
  doc.setKeywords([LEAK_NAME, 'record']);
  doc.setProducer(PRODUCER);
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(doc.context.stream(XMP, { Type: 'Metadata', Subtype: 'XML' })));
  addOutline(doc);
  addComment(doc);
  addFormField(doc);
  await doc.attach(new TextEncoder().encode(`Notes about ${LEAK_NAME}.`), 'patient-notes.txt', { mimeType: 'text/plain' });
  return doc.save({ useObjectStreams: false, updateFieldAppearances: true });
};

/** Appends an incremental update, so the name survives only in the earlier revision's bytes. */
const addIncrementalRevision = (bytes: Uint8Array): Uint8Array => {
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf') as mupdf.PDFDocument;
  doc.setMetaData('info:Keywords', 'synthetic');
  return new Uint8Array(doc.saveToBuffer('incremental').asUint8Array());
};

/** metadata-leak.pdf: the name in page text and every side channel of FR-021 (clarification Q2). */
export const generate = async (): Promise<Fixture[]> => [
  {
    fileName: 'metadata-leak.pdf',
    bytes: addIncrementalRevision(await buildBase()),
    truth: {
      name: LEAK_NAME,
      producer: PRODUCER,
      channels: ['infoDictionary', 'xmp', 'outline', 'annotationContents', 'formField', 'attachment', 'earlierRevision'],
    },
  },
];
