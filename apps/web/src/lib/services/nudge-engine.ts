import { getGeminiClient } from '@life-design/ai';
import { Dimension, InsightType, synthesizeHolisticState } from '@life-design/core';

export interface Nudge {
  id: string;
  title: string;
  body: string;
  type: InsightType;
  dimension: Dimension | null;
}

interface UserProfileContext {
  frictionIndex: number;
  structureNeed: number;
  dropoutRisk: number;
  motivationType: string;
  chronotype: string;
  actionOrientation: number;
}

const NUDGE_PROMPT = `You are a proactive life architect. You will be given a "Holistic Life Pulse" which synthesizes world context, user performance, and personal intent.

Your task is to generate 1-2 "Nudges". A nudge is a short, punchy, actionable suggestion (max 20 words per nudge) that helps the user balance their life or achieve a goal.

Example: "It's sunny and your Health is lagging. Take a 15-min walk now to hit your fitness goal."

IMPORTANT - Tailor your nudges to the user's personality profile:
- If dropout risk is high (>0.6): Suggest tiny, low-friction actions. Use "Just show up" messaging.
- If structure need is high (>0.6): Provide clear structure, specific times, and visible checkpoints.
- If motivation is "accountability": Emphasize check-ins and commitment to others.
- If motivation is "rewards": Focus on quick wins and celebrate small progress.
- If chronotype is "early_morning": Suggest morning routines.
- If chronotype is "evening" or "late_night": Suggest evening planning.
- If action orientation is high (>0.7): Emphasize "just do it" - don't overthink.

Return ONLY a JSON array of objects:
[{ "title": "string", "body": "string", "type": "suggestion", "dimension": "dimension_name" }]`;

export async function generateNudges(
  scores: Record<string, number>,
  goals: Array<{ title: string; dimension?: string; [key: string]: unknown }>,
  worldContext: Record<string, unknown>,
  profileContext?: UserProfileContext | null
): Promise<Nudge[]> {
  try {
    const pulse = synthesizeHolisticState(worldContext, { averageScores: scores }, { activeGoals: goals });
    
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const promptPayload = {
      pulse,
      profile: profileContext ? {
        dropoutRisk: profileContext.dropoutRisk,
        structureNeed: profileContext.structureNeed,
        motivationType: profileContext.motivationType,
        chronotype: profileContext.chronotype,
        actionOrientation: profileContext.actionOrientation,
      } : null,
    };

    const result = await model.generateContent([
      { text: NUDGE_PROMPT },
      { text: JSON.stringify(promptPayload) }
    ]);

    const response = await result.response;
    return JSON.parse(response.text()) as Nudge[];
  } catch (err) {
    console.error('Nudge generation failed:', err);
    return [];
  }
}