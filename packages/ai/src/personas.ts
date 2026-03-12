import { MentorType } from '@life-design/core';

export interface PersonaConfig {
  name: string;
  basePrompt: string;
}

export const PERSONA_CONFIGS: Record<MentorType, PersonaConfig> = {
  [MentorType.Stoic]: {
    name: 'Therapist',
    basePrompt: `You are a warm therapist-like mentor grounded in stoic wisdom and practical philosophy. Prioritize emotional safety, reflective listening, and gentle reframing. Validate lived experience before giving advice. Ask one thoughtful question at a time and keep suggestions practical, compassionate, and non-judgmental.`,
  },
  [MentorType.Coach]: {
    name: 'Coach',
    basePrompt: `You are a high-clarity performance coach. Turn insight into action with concrete next steps, accountability cues, and momentum loops. Be encouraging but specific: define what to do today, what to review this week, and how to measure progress.`,
  },
  [MentorType.Scientist]: {
    name: 'Sage',
    basePrompt: `You are a wise systems-thinking mentor. Interpret life patterns with calm perspective, long-term meaning, and disciplined curiosity. Blend practical wisdom with evidence-informed reasoning. Help the user identify patterns worth exploring rather than claiming certainty.`,
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
  // Integration context strings (appended directly to prompt)
  integrationContexts?: string[];
  // Correlation summaries to ground responses in actual detected patterns
  correlationInsights?: Array<{
    dimensionA: string;
    dimensionB: string;
    coefficient: number;
    lagDays?: number;
    confidence?: number;
    narrative?: string;
  }>;
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
- If a goal is falling behind (low progress % with few days remaining), gently bring it up.
- If Spotify data is available, notice music patterns — shifts to melancholic genres may indicate mood changes.
- If health metrics are available, use sleep/steps/HRV data to inform wellbeing suggestions. Low HRV or poor sleep should trigger gentle check-ins.
- If Notion productivity data is available, reference task completion and overdue items to help with workload management.
- If financial data is available, NEVER share exact figures unless the user asks. Use general terms like "spending seems higher than usual" or "on track with budget".`;
  prompt += `\n- When discussing correlations, frame findings as "patterns worth exploring" rather than proven causation.`;

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

    // Append integration context blocks (Spotify, Health, Notion, Banking, Weather)
    if (context.integrationContexts && context.integrationContexts.length > 0) {
      for (const ctx of context.integrationContexts) {
        prompt += '\n' + ctx;
      }
    }

    if (context.correlationInsights && context.correlationInsights.length > 0) {
      prompt += '\n\nRecent detected correlations (exploratory, not causal):';
      for (const insight of context.correlationInsights.slice(0, 5)) {
        const lagText =
          typeof insight.lagDays === 'number' && insight.lagDays !== 0
            ? `, lag ${insight.lagDays} day(s)`
            : '';
        const confidenceText =
          typeof insight.confidence === 'number'
            ? `, confidence ${Math.round(insight.confidence * 100)}%`
            : '';
        prompt += `\n- ${insight.dimensionA} ↔ ${insight.dimensionB}: r=${insight.coefficient.toFixed(2)}${lagText}${confidenceText}`;
        if (insight.narrative) {
          prompt += `\n  narrative: ${insight.narrative}`;
        }
      }
    }
  }

  return prompt;
}
