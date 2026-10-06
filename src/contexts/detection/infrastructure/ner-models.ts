import { EnsembleRecognizer } from './ensemble-recognizer';
import { PII_LABELS } from './label-mapping';
import { TransformersJsRecognizer, type ClassifierLoader } from './transformers-js-recognizer';

/**
 * On-device NER model (id matches tools/fetch-models/models.lock.json). Since 2026-10-04 it is the
 * multilingual DistilBERT the app already used, fine-tuned on 22 Italian PII labels (same size and
 * speed; training scripts in tools/pii-model). The ensemble accepts more models later.
 */
export const NER_MODELS = {
  pii: 'oscurapdf/pii-it-distilbert',
} as const;

export const createNerEnsemble = (load: ClassifierLoader): EnsembleRecognizer =>
  new EnsembleRecognizer([new TransformersJsRecognizer(NER_MODELS.pii, PII_LABELS, load)]);
