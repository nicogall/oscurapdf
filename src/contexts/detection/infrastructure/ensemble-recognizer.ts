import { createDetectionCandidate, type DetectionCandidate } from '@shared-kernel/published';
import type { EntityRecognizer, ProgressSink } from '../application/ports/entity-recognizer';
import { gradeModelFinding } from '../domain/model-finding-policy';
import { gradeOrganization } from '../domain/organization-policy';
import { gradePerson } from '../domain/person-policy';
import type { ModelEntity } from './label-mapping';

/** One on-device model producing entities in the app's categories. */
export interface ModelRecognizer {
  readonly id: string;
  recognize(text: string, progress?: (fraction: number) => void): Promise<ModelEntity[]>;
}

interface Vote {
  readonly model: string;
  readonly entity: ModelEntity;
}

/** Groups overlapping votes of the same category (sweep over positions). */
const clusters = (votes: readonly Vote[]): Vote[][] => {
  const sorted = [...votes].sort((a, b) => a.entity.range.start - b.entity.range.start);
  const groups: Vote[][] = [];
  for (const vote of sorted) {
    const group = groups.find((g) => g.some((v) => v.entity.category === vote.entity.category && v.entity.range.end > vote.entity.range.start && vote.entity.range.end > v.entity.range.start));
    if (group === undefined) groups.push([vote]);
    else group.push(vote);
  }
  return groups;
};

/** People and organizations each have their own precision policy; everything else shares one. */
const grade = (text: string, group: readonly Vote[]) => {
  const span = { start: Math.min(...group.map((v) => v.entity.range.start)), end: Math.max(...group.map((v) => v.entity.range.end)) };
  const score = Math.max(...group.map((v) => v.entity.score));
  const category = group[0]?.entity.category;
  if (category === undefined) return undefined;
  if (category === 'PERSON') return gradePerson(text, span, score, new Set(group.map((v) => v.model)).size);
  return category === 'ORGANIZATION' ? gradeOrganization(text, span, score) : gradeModelFinding(text, span, score, category);
};

const toCandidate = (text: string, group: readonly Vote[]): DetectionCandidate[] => {
  const category = group[0]?.entity.category;
  const graded = grade(text, group);
  if (category === undefined || graded === undefined) return [];
  const candidate = createDetectionCandidate(text, { category, range: graded.range, confidence: graded.confidence, method: 'ner' });
  return candidate.ok ? [candidate.value] : [];
};

/**
 * Union of every model's entities, reconciling overlaps. A failing model is skipped; only when all
 * models fail does detection throw (the pipeline then reports `degraded`).
 */
export class EnsembleRecognizer implements EntityRecognizer {
  constructor(private readonly models: readonly ModelRecognizer[]) {}

  async detect(text: string, progress?: ProgressSink): Promise<DetectionCandidate[]> {
    const votes: Vote[] = [];
    let failures = 0;
    for (const [i, model] of this.models.entries()) {
      try {
        const entities = await model.recognize(text, (f) => progress?.('ner', (i + f) / this.models.length));
        votes.push(...entities.map((entity) => ({ model: model.id, entity })));
      } catch {
        failures += 1;
      }
    }
    if (failures === this.models.length) throw new Error('all NER models failed');
    return clusters(votes).flatMap((group) => toCandidate(text, group));
  }
}
