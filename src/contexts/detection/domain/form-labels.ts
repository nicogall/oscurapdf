/** Words that label form fields (IT + EN). They are never a person's name or a field value. */
export const FORM_LABEL_WORDS: ReadonlySet<string> = new Set([
  'cognome', 'nome', 'sesso', 'cittadinanza', 'italiana', 'italiano', 'stato', 'civile', 'nato', 'nata', 'data', 'luogo', 'nascita',
  'residenza', 'residente', 'indirizzo', 'comune', 'provincia', 'professione', 'codice', 'fiscale', 'firma', 'documento',
  'rilasciato', 'scadenza', 'statura', 'nominativo', 'intestatario', 'titolare', 'sottoscritto', 'sottoscritta', 'via', 'piazza',
  'name', 'surname', 'sex', 'nationality', 'date', 'birth', 'place', 'address', 'signature', 'tel', 'email',
]);

export const isFormLabel = (word: string): boolean => FORM_LABEL_WORDS.has(word.toLowerCase());
