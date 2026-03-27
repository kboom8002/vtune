import { ToneCard, VibeVector, VectorSampleResult } from '../types';
import { applyL1Gate, clampVector } from '../math';

export function n2_vectorSample(card: ToneCard): VectorSampleResult {
  const mu = card.qpe_mu;
  const sigma = card.qpe_sigma;
  
  // v1: The exact mu target (base genre target)
  const v1 = { ...mu };
  
  // v2: Emphasize Warmth & Empathy (relationship safe)
  // We add up to 1 sigma for warmth/empathy, but bounded by Gate.
  let v2_raw: VibeVector = JSON.parse(JSON.stringify(mu));
  v2_raw.affect.warmth += sigma.affect.warmth;
  v2_raw.affect.empathy += sigma.affect.empathy;
  v2_raw.affect.professionalism -= sigma.affect.professionalism * 0.5; // slight trade-off
  const v2 = clampVector(applyL1Gate(v2_raw, mu, 0.20));
  
  // v3: Emphasize Clarity & Assertiveness (boundary/decision)
  let v3_raw: VibeVector = JSON.parse(JSON.stringify(mu));
  v3_raw.semantic.clarity += sigma.semantic.clarity;
  v3_raw.semantic.assertiveness += sigma.semantic.assertiveness;
  v3_raw.affect.warmth -= sigma.affect.warmth * 0.5; // trade-off to be firmer
  const v3 = clampVector(applyL1Gate(v3_raw, mu, 0.20));
  
  return { v1, v2, v3 };
}
