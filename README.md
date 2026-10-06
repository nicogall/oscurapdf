<p align="center">
  <img src="public/favicon.svg" width="96" height="96" alt="Logo di OscuraPDF">
</p>

<h1 align="center">OscuraPDF</h1>

<p align="center">
  <strong>Anonimizza i tuoi PDF, offline.</strong><br>
  Disponibile su <a href="https://oscurapdf.it"><strong>oscurapdf.it</strong></a>
</p>

---

OscuraPDF toglie dai PDF i dati che identificano una persona, **senza caricare il documento da
nessuna parte**: tutto avviene nel browser. Il resto del contenuto rimane intatto, così il documento
si può ancora leggere e condividere.

## Come funziona

1. **Apri un PDF** con testo (fino a 50 MB).
2. **L'app propone cosa oscurare**: nomi, codice fiscale, partita IVA, IBAN, carte, email, telefoni,
   indirizzi, documenti, targhe, siti web, aziende ed enti, numeri di pratica e di atto, dati
   catastali. Usa regole con controlli matematici e un modello che gira sul tuo dispositivo.
3. **Rivedi e correggi.** Le proposte sono un punto di partenza, non una garanzia: togli quelle
   sbagliate e aggiungi qualsiasi testo o area.
4. **Esporta.** Il contenuto viene rimosso dal file, non coperto da un rettangolo nero.
5. **Verifica.** Due motori PDF indipendenti riaprono il nuovo file e controllano che ciò che hai
   oscurato non ci sia più.

Non cerca date, diagnosi e farmaci, firme e pagine scansionate: questi li aggiungi tu a mano.

## Il modello

Il riconoscimento dal contesto usa un DistilBERT multilingue su cui abbiamo fatto fine-tuning per i
dati personali italiani: 22 etichette (nomi, organizzazioni, indirizzi, identificativi, targhe…)
invece delle 3 del modello di partenza.

- **Dati:** circa 52.000 frasi sintetiche di prosa legale e amministrativa italiana, dal dataset
  pubblico `rizzoaiacademy/anonimizzazione-testi-italiano` (MIT). Nessun dato di persone reali.
- **Addestramento:** 2 epoche, circa 90 minuti su un Apple M1 Pro.
- **Nel browser:** convertito in ONNX e compresso a 8 bit, pesa 135 MB e gira con Transformers.js.

Le regole danno confidenza alta a ciò che possono verificare; quello che trova solo il modello è
mostrato ma non preselezionato. Gli script per rifare l'addestramento sono in `tools/pii-model`.

## Privacy

Nessun contenuto del documento, testo estratto o nome di file lascia il dispositivo. Dopo la prima
analisi l'app funziona anche offline.

## Avvio in locale

Serve Node.js 22.

```bash
npm ci
npm run models:fetch     # modello e runtime ONNX
npm run fixtures:build   # PDF di prova sintetici
npm run dev
```

I controlli di qualità sono `npm run typecheck`, `lint`, `arch`, `test:coverage` e `test:e2e`. I
documenti di progetto sono in `specs/001-oscurapdf/`.

## Licenza

AGPL-3.0-or-later (vedi `LICENSE`). L'app include MuPDF, distribuito con licenza AGPL.
