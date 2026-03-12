import { getGeminiClient } from './client';

export interface CheckInData {
  date: string;
  mood: number;
  scores: Array<{ dimension: string; score: number }>;
}

export interface GeneratedInsight {
  type: 'trend' | 'correlation' | 'suggestion' | 'goal_progress' | 'goal_risk';
  title: string;
  body: string;
  dimension: string | null;
}

const ANALYSIS_PROMPT = `You are a wellness data analyst. Analyze the user's check-in data and generate actionable insights.

The user's world context (local weather, news, interests) is provided for granular context.
Return a JSON array of insights. Each insight has:
- type: "trend" | "correlation" | "suggestion"
- title: short headline (under 60 chars)
- body: 1-2 sentence explanation
- dimension: the relevant dimension name or null

Focus on:
- Trends: improving or declining dimensions
- Correlations: dimensions that move together
- Suggestions: actionable advice based on patterns and real-world context (weather, local news, etc.)

Return ONLY valid JSON array, no other text.`;

export async function generateInsights(
  checkIns: CheckInData[],
  worldContext?: any,
): Promise<GeneratedInsight[]> {
  if (checkIns.length === 0) return [];

  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const dataStr = JSON.stringify(
      checkIns.map((c) => ({
        date: c.date,
        mood: c.mood,
        dimensions: Object.fromEntries(c.scores.map((s) => [s.dimension, s.score])),
      })),
    );

    const contextStr = worldContext ? JSON.stringify(worldContext) : 'No additional context';

    const result = await model.generateContent([
      { text: ANALYSIS_PROMPT },
      { text: `Current World Context: ${contextStr}` },
      { text: `Here is my check-in data from the past ${checkIns.length} days:\n${dataStr}` },
    ]);
    
    const response = await result.response;
    const text = response.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
