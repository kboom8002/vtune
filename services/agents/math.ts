import { VibeVector } from './types';

export function calculateL2Distance(v1: VibeVector, v2: VibeVector): number {
  let sum = 0;
  for (const axis of ['warmth', 'energy', 'empathy', 'professionalism'] as const) {
    sum += Math.pow(v1.affect[axis] - v2.affect[axis], 2);
  }
  for (const axis of ['clarity', 'assertiveness', 'hedging', 'structure'] as const) {
    sum += Math.pow(v1.semantic[axis] - v2.semantic[axis], 2);
  }
  return Math.sqrt(sum);
}

export function calculateL1Distance(v1: VibeVector, v2: VibeVector): number {
  let sum = 0;
  for (const axis of ['warmth', 'energy', 'empathy', 'professionalism'] as const) {
    sum += Math.abs(v1.affect[axis] - v2.affect[axis]);
  }
  for (const axis of ['clarity', 'assertiveness', 'hedging', 'structure'] as const) {
    sum += Math.abs(v1.semantic[axis] - v2.semantic[axis]);
  }
  return sum;
}

export function clampVector(v: VibeVector): VibeVector {
  const clamp = (val: number) => Math.max(0, Math.min(1, val));
  return {
    affect: {
      warmth: clamp(v.affect.warmth),
      energy: clamp(v.affect.energy),
      empathy: clamp(v.affect.empathy),
      professionalism: clamp(v.affect.professionalism),
    },
    semantic: {
      clarity: clamp(v.semantic.clarity),
      assertiveness: clamp(v.semantic.assertiveness),
      hedging: clamp(v.semantic.hedging),
      structure: clamp(v.semantic.structure),
    }
  };
}

// Ensure L1 distance from mu is max maxDelta. If more, scale the difference down.
export function applyL1Gate(v: VibeVector, mu: VibeVector, maxDelta: number = 0.20): VibeVector {
  const currentL1 = calculateL1Distance(v, mu);
  if (currentL1 <= maxDelta) return v;
  
  // Scale down the difference
  const scale = maxDelta / currentL1;
  const adjust = (val: number, ref: number) => ref + (val - ref) * scale;
  
  return {
    affect: {
      warmth: adjust(v.affect.warmth, mu.affect.warmth),
      energy: adjust(v.affect.energy, mu.affect.energy),
      empathy: adjust(v.affect.empathy, mu.affect.empathy),
      professionalism: adjust(v.affect.professionalism, mu.affect.professionalism),
    },
    semantic: {
      clarity: adjust(v.semantic.clarity, mu.semantic.clarity),
      assertiveness: adjust(v.semantic.assertiveness, mu.semantic.assertiveness),
      hedging: adjust(v.semantic.hedging, mu.semantic.hedging),
      structure: adjust(v.semantic.structure, mu.semantic.structure),
    }
  };
}
