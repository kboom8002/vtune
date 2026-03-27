import { IntakePayload, n1_parseInput } from './nodes/N1_ParseInput';
import { n2_vectorSample } from './nodes/N2_VectorSample';
import { n3_rewrite } from './nodes/N3_Rewrite3';
import { n4_validate, FinalVariant } from './nodes/N4_Validate';
import { ToneCard } from './types';

export interface OrchestrationResult {
  session_id?: string;
  variants: FinalVariant[];
}

export async function runRewritePipeline(input: IntakePayload, toneCard: ToneCard): Promise<OrchestrationResult> {
  // [N0 -> N1] Norm input
  const taskContract = await n1_parseInput(input);
  
  // [N2] Mathematics
  const targetVectors = n2_vectorSample(toneCard);
  
  let retryCount = 0;
  const MAX_RETRY = 2;
  let finalVariants: FinalVariant[] | null = null;
  let currentContract = taskContract;

  // Retry loop: N3 -> N4 -> N3
  while (retryCount <= MAX_RETRY) {
    // [N3]
    const rawVariants = await n3_rewrite(currentContract, targetVectors);
    
    // [N4]
    const validated = await n4_validate(currentContract, rawVariants, targetVectors);
    
    const blocks = validated.filter(v => v.status === 'BLOCK');
    
    if (blocks.length === 0) {
      finalVariants = validated;
      break; 
    } else {
      retryCount++;
      // Feed backward the block reasons
      const blockedReasons = blocks.map(b => b.variant_id + " failed due to: " + b.mixed_signal_flags.join(',')).join('; ');
      const constraintsStr = "Retry to avoid: " + blockedReasons;
      currentContract.context_note += "\\n" + constraintsStr; // push to constraints
    }
  }
  
  if (!finalVariants) {
    throw new Error('Hit max retries due to persistent blocks in MS-Guard.');
  }

  // [N5/N6] Next.js route API will format payload and call supabase.
  return {
    variants: finalVariants
  };
}
