export type ConfidenceLevel = 'high' | 'medium' | 'low';

const RANK: Record<ConfidenceLevel, number> = { low: 0, medium: 1, high: 2 };

export const compareConfidence = (a: ConfidenceLevel, b: ConfidenceLevel): number => RANK[a] - RANK[b];
