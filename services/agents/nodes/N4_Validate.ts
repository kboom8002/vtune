import { TaskContract, RewriteVariant, VectorSampleResult, N4ValidationOutput, ValidationResultObj } from '../types';
import { PROMPTS, N4_SCHEMA } from '../prompts';
import { generateStructured } from '../gemini';
import { calculateL2Distance } from '../math';

export interface FinalVariant extends RewriteVariant {
  target_axes: any;
  axes_estimate: any;
  axes_delta_l2: number;
  mixed_signal_flags: string[];
  status: 'PASS' | 'FIX' | 'BLOCK';
}

export async function n4_validate(
  taskContract: TaskContract, 
  variants: RewriteVariant[], 
  targets: VectorSampleResult
): Promise<FinalVariant[]> {
  
  // Call LLM for Mixed Signal Guard and Validation
  const userPrompt = PROMPTS.N4_USER(
    JSON.stringify(taskContract, null, 2),
    JSON.stringify({ rewrites: variants }, null, 2)
  );
  
  const llmAssessed = await generateStructured<N4ValidationOutput>(PROMPTS.N4_SYSTEM, userPrompt, N4_SCHEMA);

  const finalVariants: FinalVariant[] = variants.map(v => {
    const valObj = llmAssessed.validation.results.find(r => r.variant_id === v.variant_id);
    const targetVector = targets[v.variant_id as keyof VectorSampleResult];
    const estimatedVector = v.self_check.axes_alignment;
    
    // Override calculate strictly programmatically instead of trusting LLM
    const deltaL2 = calculateL2Distance(targetVector, estimatedVector);
    
    // If delta > 0.35, we force BLOCK regardless of LLM MS-Guard
    let status = valObj?.status || 'BLOCK';
    if (deltaL2 > 0.35) status = 'BLOCK';

    return {
      ...v,
      target_axes: targetVector,
      axes_estimate: estimatedVector,
      axes_delta_l2: deltaL2,
      mixed_signal_flags: valObj?.flags || [],
      status
    };
  });

  return finalVariants;
}
