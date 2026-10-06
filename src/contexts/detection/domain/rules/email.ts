import type { Detector } from '../detector';
import { candidateAt, matchesOf } from './pattern-match';

const EMAIL = /(?<![\p{L}\p{N}._%+-])[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}(?![\p{L}\p{N}])/gu;

export const emailDetector: Detector = {
  name: 'email',
  detect: (input) => matchesOf(input, EMAIL).flatMap((m) => candidateAt(input, m.range, 'EMAIL', 'high')),
};
