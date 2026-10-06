import type { landingEn } from './landing-en';

/** Testi italiani della pagina iniziale. */
export const landingIt: typeof landingEn = {
  eyebrow: 'Gratis · Open source · Nessun account',
  title: 'Anonimizza i tuoi PDF,',
  titleHighlight: 'offline.',
  lead: 'Nomi, codici fiscali, IBAN, indirizzi: l’app li trova, tu confermi, e spariscono davvero dal file.',
  dropMeta: 'PDF fino a 50 MB · documenti con testo',
  stats: {
    bytes: { value: '0 byte', label: 'inviati a qualsiasi server' },
    checks: { value: '6 controlli', label: 'su ogni file esportato' },
    removed: { value: 'Rimossi', label: 'dal file, non coperti' },
  },
  steps: {
    title: 'Come funziona',
    open: { title: 'Apri il PDF', body: 'Trascinalo su questa pagina. Resta sul tuo computer: non viene inviato a nessuno, nemmeno il nome del file.' },
    review: { title: 'Rivedi le proposte', body: 'Il riconoscimento automatico è un punto di partenza, non una garanzia. Togli quello che non va, aggiungi qualsiasi testo o area. Annulli e ripeti con Cmd+Z.' },
    export: { title: 'Esporta e verifica', body: 'Il contenuto viene rimosso dal file, non coperto. Poi un secondo motore PDF, indipendente, controlla che non ne resti traccia.' },
  },
  finds: 'Cosa trova e cosa no',
  detects: {
    title: 'Cosa cerca in automatico',
    subtitle: 'Sono proposte: qualcosa può sfuggire o essere segnalato per errore. Le rivedi tutte prima di esportare.',
    names: 'Nomi e cognomi',
    taxCode: 'Codice fiscale',
    vat: 'Partita IVA',
    iban: 'IBAN',
    card: 'Carte di pagamento',
    email: 'Email',
    phone: 'Numeri di telefono',
    address: 'Indirizzi',
    ids: 'Documenti d’identità',
    codes: 'Codici cliente, pratica, protocollo, fattura…',
    cadastral: 'Dati catastali',
    fields: 'Campi di moduli (cognome, luogo di nascita…)',
    websites: 'Siti web',
    companies: 'Nomi di aziende ed enti',
    plates: 'Targhe',
  },
  notDetects: {
    title: 'Cosa non cerca: lo aggiungi tu',
    subtitle: 'Selezioni il testo, o disegni un riquadro sulle immagini.',
    dates: 'Date',
    health: 'Diagnosi, patologie, farmaci',
    signatures: 'Firme e timbri',
    scans: 'Pagine scansionate',
  },

  faq: {
    title: 'Domande',
    upload: { q: 'Il mio documento viene caricato da qualche parte?', a: 'No. Il PDF viene aperto, analizzato e riscritto interamente nel tuo browser. Il contenuto non viaggia mai in rete e, dopo la prima analisi, l’app funziona anche offline.' },
    scans: { q: 'Funziona con i documenti scansionati?', a: 'Non ancora in automatico: le pagine scansionate non hanno testo da cercare. L’app ti dice quali pagine non sono state controllate, e puoi comunque oscurarle selezionando un’area.' },
    misses: { q: 'Il riconoscimento automatico può sbagliare?', a: 'Sì: può non trovare un dato o segnalarne uno per errore. Rivedi sempre le proposte e scorri il documento: puoi togliere qualsiasi proposta e aggiungere qualsiasi testo o area.' },
    verify: { q: 'Come so che l’oscuramento ha funzionato?', a: 'Dopo l’esportazione, un secondo motore PDF indipendente esegue sei controlli sul nuovo file. Viene dichiarato sicuro solo se li supera tutti.' },
    free: { q: 'È gratis?', a: 'Sì. È gratuito e open source, con licenza AGPL-3.0.' },
  },
  footer: {
    privacy: 'Nessun account, nessun cookie, nessun tracciamento.',
    linksLabel: 'Informazioni legali',
    links: { privacy: 'Privacy', terms: 'Condizioni d’uso', source: 'GitHub', licenses: 'Licenze' },
  },
};
