/**
 * Realistic synthetic documents for the precision evaluation (SC-006b). Personal data we must
 * redact is marked ⟦like this⟧: names, birth/residence places, addresses, tax codes, IBANs, cards,
 * emails, phones, document numbers and other codes/long numbers, and (since 2026-10-04) companies,
 * institutions, websites and number plates. Everything else (countries, amounts, dates, article numbers,
 * form labels, and clinical content: diagnoses, conditions, medicines) is context and must not be suggested.
 * All people, codes and accounts are fictional (constitution V).
 */
export interface AnnotatedDocument {
  readonly name: string;
  readonly marked: string;
}

const ID_CARD = `REPUBBLICA ITALIANA
CARTA D'IDENTITÀ N. ⟦CA12345AB⟧
Cognome ⟦ROSSI⟧
Nome ⟦MARIO⟧
Luogo e data di nascita ⟦PALERMO⟧ 10/12/1985
Sesso M Statura 178 Cittadinanza Italiana
Comune di residenza ⟦Milano⟧
Indirizzo ⟦Via Giuseppe Verdi 12, 20121 Milano (MI)⟧
Codice fiscale ⟦RSSMRA85T10A562S⟧
Stato civile Celibe
Scadenza 10/12/2030
Firma del titolare`;

const CONTRACT = `CONTRATTO DI CONSULENZA
Tra la società ⟦Alfa Servizi S.r.l.⟧, con sede legale in ⟦Corso Vittorio Emanuele II 45, 10121 Torino⟧, partita IVA ⟦01234567897⟧,
e il sig. ⟦Luca Bianchi⟧, nato a ⟦Bologna⟧ il 3 marzo 1980, residente in ⟦Bologna⟧, ⟦Viale Carducci 22⟧,
codice fiscale ⟦BNCLCU80C03Z999F⟧, email ⟦luca.bianchi@example.it⟧, cellulare ⟦+39 347 555 0192⟧.
Art. 1 - Oggetto. Il consulente presta attività di analisi per il mercato degli USA e della Germania.
Art. 2 - Compenso. Il corrispettivo è di 12.500,00 euro, pagato entro 30 giorni sul conto IBAN ⟦IT60X0542811101000000123456⟧.
Art. 3 - Durata. Il contratto ha durata di 12 mesi dal 1 gennaio 2026. Pratica n. ⟦PR-2026-0042⟧.
Art. 4 - Foro competente. Per ogni controversia è competente il ⟦Tribunale di Torino⟧.
Letto, confermato e sottoscritto a Torino.`;

const INVOICE = `INVOICE No. ⟦2026-00451⟧
Date: 14 March 2026    Order number: ⟦784512369⟧
Bill to: ⟦Emily Clarke⟧, ⟦221 Baker Street⟧, London NW1 6XE, United Kingdom
Email: ⟦emily.clarke@example.co.uk⟧    Phone: ⟦+44 20 7946 0958⟧
Customer ID: ⟦CUST-88412⟧
Item                     Qty   Unit price   Total
Ergonomic chair          3     1,250.00     3,750.00
Standing desk            1     2,100.00     2,100.00
Subtotal 5,850.00 USD    VAT 20%    Total 7,020.00 USD
Shipped from the USA via New York. Paid by card ⟦4111 1111 1111 1111⟧.
Thank you for your business!`;

const LETTER = `Dear Mr. ⟦James Walker⟧,
Following our meeting in Washington with representatives of the ⟦United Nations⟧ and ⟦Microsoft⟧,
we confirm the schedule for the ISO 9001:2015 audit (Section 4.2.1, page 3 of 10).
Last year the programme reached 1,234,567 visitors in 42 countries, including France, Italy and Japan.
Please quote your account number ⟦GB29NWBK60161331926819⟧ and case number ⟦77-41920⟧ in any reply.
You can reach my assistant ⟦Sophie Turner⟧ at ⟦sophie.turner@example.org⟧.
Kind regards,
⟦Hannah Edwards⟧
Head of Operations, ⟦Northwind Traders⟧`;

const DATA_SHEET = `SCHEDA ANAGRAFICA DIPENDENTE
Nome e cognome: ⟦Giulia Verdi⟧
Nata a ⟦Milano⟧ il 05/05/1992
Codice fiscale: ⟦VRDGLI92E45Z999V⟧
Residente a ⟦Monza⟧ in ⟦Via dei Mille 8⟧
Telefono ⟦02 8765 4321⟧
Matricola ⟦45821⟧
Reparto: Amministrazione    Livello: 3    Contratto: CCNL Commercio
Ore settimanali 40    Ferie residue 12 giorni    Anno 2026`;

/** Surnames in every shape: alone, after titles, in capitals, in lists, and as common words. */
const MINUTES = `VERBALE DI ASSEMBLEA CONDOMINIALE
Il giorno 12 marzo 2026 si è riunita l'assemblea del condominio di ⟦Via Garibaldi 14, 10122 Torino⟧.
Presiede l'avv. ⟦Ferrari⟧; funge da segretario il sig. ⟦Esposito⟧.
Sono presenti i condomini ⟦ROSSI MARIO⟧, ⟦BIANCHI GIULIA⟧ e ⟦DE LUCA GIOVANNI⟧.
L'amministratore, dott.ssa ⟦Greco⟧, illustra il bilancio: la manutenzione costa 4.200 euro.
Il condomino ⟦Rossi⟧ chiede chiarimenti sulla fontana del cortile e sul muro bianco.
La sig.ra ⟦Bianchi⟧ propone di rinviare. Il sig. ⟦D'Angelo⟧ si astiene.
Gentile ⟦Rossi⟧, la informiamo che la prossima assemblea si terrà a Torino.
Firmato: ⟦Paolo Fontana⟧ (presidente), ⟦Laura Costa⟧ (segretaria).`;

/** Rare surnames first ("Cognome Nome"), as in Italian lists and registers, plus sentence-start traps. */
const ATTENDANCE = `REGISTRO PRESENZE - CORSO DI FORMAZIONE SICUREZZA
Docente: ⟦Ipotetico Ornella⟧
Partecipanti:
⟦Fittizio Marilena⟧, ⟦Lo Fittizio Gaetano⟧, ⟦Inventato Rosaria⟧
⟦Esempio Calogero⟧ - assente giustificato
Il dipendente ⟦Immaginario Agata⟧ è assegnato al reparto Logistica.
Oggi ⟦Marilena⟧ ha consegnato il questionario. Grazie ⟦Gaetano⟧ per la collaborazione.
Prossima sessione: aula Magna, martedì alle 9.`;

/** No personal data at all: every suggestion here is a false positive. */
const NO_PII_REPORT = `RELAZIONE TRIMESTRALE - Q1 2026
Nel primo trimestre le vendite negli USA sono cresciute del 12,5% rispetto al 2025, mentre in Europa
(Italia, Francia, Germania) la crescita è stata del 4%. Il fatturato consolidato è di 3.450.000 euro.
Cittadinanza Italiana Stato Civile Sesso Data di nascita Luogo di nascita
Tabella 3 - Pagina 7 di 24 - Versione 2.1 - Allegato B
Il Consiglio di Amministrazione ha approvato le linee guida del 15 aprile sul conto IBAN aziendale.
Codice Ateco 62.01.00 - Norma UNI EN ISO 9001:2015 - Decreto Legislativo 196/2003, art. 13.
L'assemblea si riunirà a Roma presso la sede di Piazza Venezia. Vedi report.pdf, art.13.`;

/**
 * A clinical document: who the patient is must go, what the patient has must stay (2026-10-04), so that
 * the document is still useful to whoever reads it. Number plates, a website, a hospital and an insurer.
 */
const MEDICAL_REPORT = `RELAZIONE MEDICA - SINISTRO STRADALE
Paziente: ⟦Inventato Rosaria⟧    Tessera sanitaria n. ⟦80380000900123456789⟧
Struttura: ⟦Ospedale San Fittizio⟧ - prenotazioni su ⟦www.ospedale-esempio.it⟧
Diagnosi: trauma distorsivo del rachide cervicale
Anamnesi: la paziente è affetta da diabete mellito di tipo 2 e in cura per ipertensione arteriosa.
Terapia in atto: metformina 500 mg
Allergie: nessuna
Il veicolo targato ⟦AB 123 CD⟧, assicurato con ⟦Assicurazioni Esempio S.p.A.⟧, è stato urtato dal motociclo targa ⟦XY 12345⟧.
La polizza rimborsa le spese di fisioterapia fino a 1.500 euro. Prognosi: 20 giorni.`;

export const PRECISION_CORPUS: readonly AnnotatedDocument[] = [
  { name: 'Carta d’identità (IT)', marked: ID_CARD },
  { name: 'Contratto (IT)', marked: CONTRACT },
  { name: 'Invoice (EN)', marked: INVOICE },
  { name: 'Business letter (EN)', marked: LETTER },
  { name: 'Scheda dipendente (IT)', marked: DATA_SHEET },
  { name: 'Verbale con cognomi (IT)', marked: MINUTES },
  { name: 'Registro presenze (IT)', marked: ATTENDANCE },
  { name: 'Relazione medica (IT)', marked: MEDICAL_REPORT },
  { name: 'Relazione senza dati personali (IT)', marked: NO_PII_REPORT },
];
