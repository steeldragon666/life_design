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

export interface ActiveGoalContext {
  title: string;
  horizon: string;
  status: string;
  trackingType: string;
  progressPercent: number;
  daysRemaining: number;
  dimensions: string[];
}

export interface UserContext {
  recentMood?: number;
  topDimension?: string;
  lowDimension?: string;
  streak?: number;
  // Goal-aware context
  activeGoals?: ActiveGoalContext[];
  // Profession-aware context
  profession?: string;
  postcode?: string;
  interests?: string[];
  hobbies?: string[];
}

export function buildSystemPrompt(
  mentorType: MentorType,
  context?: UserContext,
): string {
  const config = PERSONA_CONFIGS[mentorType];
  let prompt = config.basePrompt;

  // Add profession-aware instructions
  prompt += `\n\nIMPORTANT CONTEXTUAL AWARENESS:
- If the user has a profession, be aware of industry-specific stressors and events.
  - For commodities/finance professionals: track market volatility, ask how major market events affected them today.
  - For retail workers: be aware of peak seasons (Black Friday, Christmas, sales periods), ask about stress from increased customer volume.
  - For healthcare workers: be mindful of shift patterns and emotional toll.
  - For teachers: consider term times, exam seasons, parent meetings.
  - Adapt your awareness to ANY profession — think about what external pressures affect them.
- If the user has a postcode and hobbies/interests, consider weather and local events when making suggestions.
- Reference active goals naturally in conversation — encourage progress, suggest strategies, warn about at-risk dimensions.
- If a goal is falling behind (low progress % with few days remaining), gently bring it up.`;

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
    if (context.profession) {
      contextLines.push(`- Profession: ${context.profession}`);
    }
    if (context.postcode) {
      contextLines.push(`- Location (postcode): ${context.postcode}`);
    }
    if (context.interests && context.interests.length > 0) {
      contextLines.push(`- Interests: ${context.interests.join(', ')}`);
    }
    if (context.hobbies && context.hobbies.length > 0) {
      contextLines.push(`- Hobbies: ${context.hobbies.join(', ')}`);
    }

    if (context.activeGoals && context.activeGoals.length > 0) {
      contextLines.push('\nActive goals:');
      for (const goal of context.activeGoals) {
        const urgency = goal.daysRemaining < 14 ? ' [URGENT]' : goal.daysRemaining < 30 ? ' [approaching deadline]' : '';
        contextLines.push(`- "${goal.title}" (${goal.horizon}-term, ${goal.trackingType} tracking, ${goal.progressPercent}% complete, ${goal.daysRemaining} days remaining${urgency}) — dimensions: ${goal.dimensions.join(', ')}`);
      }
    }

    prompt += contextLines.join('\n');
  }

  return prompt;
}
