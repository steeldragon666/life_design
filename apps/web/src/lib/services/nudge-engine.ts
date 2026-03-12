import { getGeminiClient } from '@life-design/ai';
import { Dimension, InsightType, synthesizeHolisticState } from '@life-design/core';

export interface Nudge {
  id: string;
  title: string;
  body: string;
  type: InsightType;
  dimension: Dimension | null;
}

const NUDGE_PROMPT = `You are a proactive life architect. You will be given a "Holistic Life Pulse" which synthesizes world context, user performance, and personal intent.

Your task is to generate 1-2 "Nudges". A nudge is a short, punchy, actionable suggestion (max 20 words per nudge) that helps the user balance their life or achieve a goal.

Example: "It's sunny and your Health is lagging. Take a 15-min walk now to hit your fitness goal."

Return ONLY a JSON array of objects:
[{ "title": "string", "body": "string", "type": "suggestion", "dimension": "dimension_name" }]`;

export async function generateNudges(
  scores: any,
  goals: any,
  worldContext: any
): Promise<Nudge[]> {
  try {
    const pulse = synthesizeHolisticState(worldContext, { averageScores: scores }, { activeGoals: goals });
    
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent([
      { text: NUDGE_PROMPT },
      { text: JSON.stringify({ pulse }) }
    ]);

    const response = await result.response;
    return JSON.parse(response.text()) as Nudge[];
  } catch (err) {
    console.error('Nudge generation failed:', err);
    return [];
  }
}
