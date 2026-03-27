import { PROMPTS, N1_SCHEMA } from '../prompts';
import { generateStructured } from '../gemini';
import { TaskContract } from '../types';

export class IntakePayload {
  lang: string = 'ko';
  channel: string = 'kakao';
  length_pref: string = 'mid';
  target_role: string = 'peer';
  goal: string = '';
  tone_card_id: string = '';
  context_note: string = '';
  raw_text: string = '';
}

export async function n1_parseInput(input: IntakePayload): Promise<TaskContract> {
  const userPrompt = PROMPTS.N1_USER(
    input.lang, input.channel, input.length_pref, input.target_role, 
    input.goal, input.tone_card_id, input.context_note, input.raw_text
  );
  
  const response = await generateStructured<{task_contract: TaskContract}>(
    PROMPTS.N1_SYSTEM,
    userPrompt,
    N1_SCHEMA
  );
  
  return response.task_contract;
}
