import { GoogleGenAI, Type } from '@google/genai';

// Assuming GEMINI_API_KEY is in process.env
const ai = new GoogleGenAI({});

export async function generateStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: any
): Promise<T> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro', 
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.3,
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Empty response from model');
  }

  // Parse safety, in case the SDK doesn't auto-parse
  return JSON.parse(text) as T;
}
