/**
 * Smart journal prompts: suggests prompts related to the user's weakest dimension.
 * Uses a curated prompt bank mapped by dimension.
 */

import type { Dimension } from '@life-design/core';

const PROMPT_BANK: Record<string, string[]> = {
  career: [
    'What is one skill that, if improved, would most accelerate your career right now?',
    'Describe a recent work situation where you felt fully engaged. What made it work?',
    'What would your ideal workday look like 6 months from now?',
    'Name one professional relationship you could strengthen this week.',
  ],
  finance: [
    'What is one financial habit you could build this month to feel more secure?',
    'If you had an unexpected $1,000, what would you do with it and why?',
    'What is the biggest money-related stress you carry? What would reduce it by 50%?',
    'Describe your relationship with spending. Is it aligned with your values?',
  ],
  health: [
    'How did you sleep last night? What would help you sleep better?',
    'What is one healthy habit you dropped that you miss?',
    'When do you feel most energized during the day? How can you protect that window?',
    'What is one thing you could eat (or stop eating) to feel noticeably better?',
  ],
  fitness: [
    'What type of movement makes you feel strongest? When did you last do it?',
    'If you had 15 minutes for exercise today, what would you do?',
    'What is stopping you from being more consistent with exercise?',
    'Describe how you feel after a good workout. How can you chase that feeling more often?',
  ],
  family: [
    'Who in your family would most appreciate hearing from you today?',
    'What is one family tradition you want to start or revive?',
    'Describe a moment with family this week that made you feel connected.',
    'What does "being present" with family look like for you?',
  ],
  social: [
    'Who is someone you admire but haven\'t reached out to recently?',
    'What kind of social interaction recharges you vs. drains you?',
    'Describe your ideal social week. How does it compare to this week?',
    'What is one community or group you could join that aligns with your interests?',
  ],
  romance: [
    'What made you feel most connected to someone this week?',
    'What does love look like in your daily life right now?',
    'What is one thing you could do today to strengthen your closest relationship?',
    'Describe your ideal romantic connection. What qualities matter most?',
  ],
  growth: [
    'What is one thing you learned this week that surprised you?',
    'If you could master any skill in 90 days, what would it be?',
    'What book, podcast, or idea has been on your mind recently?',
    'Describe a recent moment where you stepped outside your comfort zone.',
  ],
};

export interface SmartPromptSuggestion {
  dimension: string;
  prompt: string;
  reason: string;
}

/**
 * Get smart journal prompts based on the user's weakest dimensions.
 * @param latestScores - Current dimension scores
 * @param count - Number of prompts to suggest (default: 2)
 */
export interface SmartPromptContext {
  goals?: Array<{ title: string; dimension?: string }>;
  moodTrend?: 'improving' | 'stable' | 'declining';
  streakDays?: number;
}

/**
 * Get smart journal prompts based on the user's weakest dimensions,
 * optionally enriched with goals, trends, and streak data.
 * @param latestScores - Current dimension scores
 * @param count - Number of prompts to suggest (default: 2)
 * @param context - Optional goals, mood trend, and streak info
 */
export function getSmartJournalPrompts(
  latestScores: Array<{ dimension: string; score: number }>,
  count = 2,
  context?: SmartPromptContext,
): SmartPromptSuggestion[] {
  if (!latestScores.length) return [];

  const sorted = [...latestScores].sort((a, b) => a.score - b.score);
  const suggestions: SmartPromptSuggestion[] = [];

  // Pick a deterministic-but-varied prompt based on date
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );

  for (const entry of sorted) {
    const prompts = PROMPT_BANK[entry.dimension];
    if (!prompts?.length) continue;

    // Check if there's a goal matching this dimension for a contextual prompt
    const matchingGoal = context?.goals?.find((g) => g.dimension === entry.dimension);
    if (matchingGoal) {
      suggestions.push({
        dimension: entry.dimension,
        prompt: `You set a goal to "${matchingGoal.title}" and your ${entry.dimension} score is ${entry.score.toFixed(1)}. What's one step you could take today?`,
        reason: `Linked to your goal and lowest-scoring area.`,
      });
      if (suggestions.length >= count) break;
      continue;
    }

    const promptIndex = dayOfYear % prompts.length;

    suggestions.push({
      dimension: entry.dimension,
      prompt: prompts[promptIndex],
      reason: `Your ${entry.dimension} score is ${entry.score.toFixed(1)} — the lowest right now.`,
    });

    if (suggestions.length >= count) break;
  }

  // Add a trend-aware prompt if mood is declining and we have room
  if (context?.moodTrend === 'declining' && suggestions.length < count) {
    suggestions.push({
      dimension: 'general',
      prompt: 'Your mood has been trending down recently. What do you think is contributing to that, and what might help turn it around?',
      reason: 'Your mood trend has been declining.',
    });
  }

  // Add a streak encouragement prompt if applicable
  if (context?.streakDays && context.streakDays >= 3 && suggestions.length < count) {
    suggestions.push({
      dimension: 'general',
      prompt: `You're on a ${context.streakDays}-day reflection streak! What pattern have you noticed across your recent check-ins?`,
      reason: `${context.streakDays}-day streak — momentum is building.`,
    });
  }

  return suggestions;
}
