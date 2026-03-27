import { TaskContract, VectorSampleResult, RewriteVariant } from '../types';
import { PROMPTS, N3_SCHEMA } from '../prompts';
import { generateStructured } from '../gemini';

export async function n3_rewrite(taskContract: TaskContract, targetVectors: VectorSampleResult): Promise<RewriteVariant[]> {
  const userPrompt = PROMPTS.N3_USER(
    JSON.stringify(taskContract, null, 2),
    JSON.stringify(targetVectors, null, 2)
  );

  const response = await generateStructured<{
    rewrite_bundle: {
      tone_card_id: string;
      channel: string;
      rewrites: RewriteVariant[];
    }
  }>(PROMPTS.N3_SYSTEM, userPrompt, N3_SCHEMA);

  return response.rewrite_bundle.rewrites;
}
