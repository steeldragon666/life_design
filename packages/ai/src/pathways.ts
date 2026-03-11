import { getAnthropicClient } from './client';

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
2. Analyze how pursuing this pathway affects each of the 8 life dimensions (career, finance, health, fitness, family, social, romance, growth)
3. Score each dimension's impact from -5 (severely negative) to +5 (highly positive)
4. Identify risks based on their current dimension scores and trends
5. Suggest strategies to mitigate negative impacts

Consider the user's profession, skills, and current life situation when analyzing impacts.

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
): Promise<GeneratedPathway> {
  const client = getAnthropicClient();

  const userMessage = `
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
${input.currentScores.map((s) => `- ${s.dimension}: ${s.average.toFixed(1)}/10 (trend: ${s.trend > 0 ? '+' : ''}${s.trend.toFixed(2)})`).join('\n')}

User's rough plan:
${input.userPlan}

Analyze this plan and structure it into a pathway with dimension impact analysis.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: PATHWAY_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI');
  }

  const parsed = JSON.parse(textBlock.text);
  return parsed as GeneratedPathway;
}
