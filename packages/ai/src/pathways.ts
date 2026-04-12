import { getGeminiClient } from './client';

export interface PathwayInput {
  goal: {
    title: string;
    description: string;
    horizon: string;
    targetDate: string;
    dimensions: string[];
  };
  userProfile: {
    profession: string | null;
    skills: string[];
    interests: string[];
    projects: string[];
  };
  currentScores: Array<{ dimension: string; average: number; trend: number }>;
  userPlan: string;
}

export interface GeneratedPathway {
  title: string;
  description: string;
  steps: Array<{ title: string; description: string }>;
  dimensionImpacts: Array<{ dimension: string; impact: number; explanation: string }>;
  risks: string[];
  suggestions: string[];
}

const PATHWAY_PROMPT = `You are a life design strategist. The user wants to achieve a goal and has described their rough plan. Your job is to:

1. Structure their plan into concrete, actionable steps (5-10 steps)
2. Analyze how pursuing this pathway affects each of the 8 life dimensions
3. Score each dimension's impact from -5 to +5
4. Identify risks based on current context and trends
5. Suggest strategies integrating real-world opportunities (based on the provided context if available)

Return ONLY valid JSON with this structure:
{
  "title": "concise pathway title",
  "description": "1-2 sentence summary",
  "steps": [{ "title": "step title", "description": "step details" }],
  "dimensionImpacts": [{ "dimension": "dimension_name", "impact": number, "explanation": "why" }],
  "risks": ["risk description"],
  "suggestions": ["mitigation strategy"]
}`;

export async function generatePathway(
  input: PathwayInput,
  worldContext?: Record<string, unknown>,
): Promise<GeneratedPathway> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ 
    model: 'gemini-1.5-pro',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const contextStr = worldContext ? JSON.stringify(worldContext) : 'No additional context';

  const userMessage = `
Context: ${contextStr}

Goal: ${input.goal.title}
Description: ${input.goal.description}
Time horizon: ${input.goal.horizon} (target: ${input.goal.targetDate})
Related dimensions: ${input.goal.dimensions.join(', ')}

User profile:
- Profession: ${input.userProfile.profession ?? 'Not specified'}
- Skills: ${input.userProfile.skills.join(', ') || 'None listed'}
- Interests: ${input.userProfile.interests.join(', ') || 'None listed'}
- Active projects: ${input.userProfile.projects.join(', ') || 'None listed'}

Current dimension scores:
${input.currentScores.map((s) => `- ${s.dimension}: ${s.average.toFixed(1)}/5 (trend: ${s.trend > 0 ? '+' : ''}${s.trend.toFixed(2)})`).join('\n')}

User's rough plan:
${input.userPlan}`;

  const result = await model.generateContent([
    { text: PATHWAY_PROMPT },
    { text: userMessage },
  ]);
  
  const response = await result.response;
  const text = response.text();
  const parsed = JSON.parse(text);
  return parsed as GeneratedPathway;
}
