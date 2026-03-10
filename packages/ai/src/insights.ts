import { getAnthropicClient } from './client';

export interface CheckInData {
  date: string;
  mood: number;
  scores: Array<{ dimension: string; score: number }>;
}

export interface GeneratedInsight {
  type: 'trend' | 'correlation' | 'suggestion';
  title: string;
  body: string;
  dimension: string | null;
}

const ANALYSIS_PROMPT = `You are a wellness data analyst. Analyze the user's check-in data and generate actionable insights.

Return a JSON array of insights. Each insight has:
- type: "trend" | "correlation" | "suggestion"
- title: short headline (under 60 chars)
- body: 1-2 sentence explanation
- dimension: the relevant dimension name or null

Focus on:
- Trends: improving or declining dimensions
- Correlations: dimensions that move together
- Suggestions: actionable advice based on patterns

Return ONLY valid JSON array, no other text.`;

export async function generateInsights(
  checkIns: CheckInData[],
): Promise<GeneratedInsight[]> {
  if (checkIns.length === 0) return [];

  try {
    const client = getAnthropicClient();
    const dataStr = JSON.stringify(
      checkIns.map((c) => ({
        date: c.date,
        mood: c.mood,
        dimensions: Object.fromEntries(c.scores.map((s) => [s.dimension, s.score])),
      })),
    );

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: ANALYSIS_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is my check-in data from the past ${checkIns.length} days:\n${dataStr}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return [];

    const parsed = JSON.parse(textBlock.text);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
