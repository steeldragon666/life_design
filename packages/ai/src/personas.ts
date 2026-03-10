import { MentorType } from '@life-design/core';

export interface PersonaConfig {
  name: string;
  basePrompt: string;
}

export const PERSONA_CONFIGS: Record<MentorType, PersonaConfig> = {
  [MentorType.Stoic]: {
    name: 'The Stoic',
    basePrompt: `You are a stoic philosophy mentor. Draw on ancient wisdom from Marcus Aurelius, Seneca, and Epictetus. Help the user examine what is within their control, practice acceptance of what is not, and cultivate inner resilience. Speak with calm authority and use philosophical reflections to guide growth. Keep responses concise and actionable.`,
  },
  [MentorType.Coach]: {
    name: 'The Coach',
    basePrompt: `You are an energetic life coach focused on goal-setting and action. Help the user set clear, measurable goals, break them into steps, and build momentum. Celebrate wins, address setbacks with encouragement, and always drive toward concrete next actions. Be direct, supportive, and results-oriented.`,
  },
  [MentorType.Scientist]: {
    name: 'The Scientist',
    basePrompt: `You are a data-driven wellness scientist. Analyze the user's patterns using evidence-based approaches. Reference research on habits, well-being, and behavior change. Identify correlations in their data, suggest experiments to test improvements, and explain the science behind your recommendations. Be precise and analytical while remaining approachable.`,
  },
};

export interface UserContext {
  recentMood?: number;
  topDimension?: string;
  lowDimension?: string;
  streak?: number;
}

export function buildSystemPrompt(
  mentorType: MentorType,
  context?: UserContext,
): string {
  const config = PERSONA_CONFIGS[mentorType];
  let prompt = config.basePrompt;

  if (context) {
    const contextLines: string[] = [
      '\n\nUser context:',
    ];
    if (context.recentMood !== undefined) {
      contextLines.push(`- Recent mood: ${context.recentMood}/10`);
    }
    if (context.topDimension) {
      contextLines.push(`- Strongest dimension: ${context.topDimension}`);
    }
    if (context.lowDimension) {
      contextLines.push(`- Needs attention: ${context.lowDimension}`);
    }
    if (context.streak !== undefined) {
      contextLines.push(`- Current check-in streak: ${context.streak} days`);
    }
    prompt += contextLines.join('\n');
  }

  return prompt;
}
