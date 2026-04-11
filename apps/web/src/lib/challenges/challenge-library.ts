// ---------------------------------------------------------------------------
// Challenge Library
// ---------------------------------------------------------------------------
// Defines the catalogue of available challenges users can start.
// ---------------------------------------------------------------------------

import { Dimension } from '@life-design/core';
import type { Challenge } from './types';

export const CHALLENGE_LIBRARY: Challenge[] = [
  {
    id: 'balance-reset',
    title: 'Balance Reset',
    description:
      'A 7-day journey to reconnect with all 8 dimensions of your life through daily micro-actions.',
    dimensions: [Dimension.Health, Dimension.Growth, Dimension.Social],
    difficulty: 'beginner',
    durationDays: 7,
    days: [
      {
        day: 1,
        title: 'Foundation',
        tasks: [
          {
            id: 'balance-reset-d1-check_in-0',
            type: 'check_in',
            title: 'Complete a check-in',
            description: 'Start by reflecting on where you are right now.',
          },
          {
            id: 'balance-reset-d1-reflection-0',
            type: 'reflection',
            title: 'Write about your goals',
            description: 'What would a balanced life look like for you?',
          },
        ],
      },
      {
        day: 2,
        title: 'Physical Wellness',
        tasks: [
          {
            id: 'balance-reset-d2-check_in-0',
            type: 'check_in',
            title: 'Morning check-in',
            description: 'Reflect on your physical wellbeing.',
          },
          {
            id: 'balance-reset-d2-action-0',
            type: 'action',
            title: '20-minute walk',
            description: 'Take a mindful walk and notice your surroundings.',
          },
        ],
      },
      {
        day: 3,
        title: 'Connection',
        tasks: [
          {
            id: 'balance-reset-d3-check_in-0',
            type: 'check_in',
            title: 'Daily check-in',
            description: 'How are your relationships today?',
          },
          {
            id: 'balance-reset-d3-action-0',
            type: 'action',
            title: 'Reach out to someone',
            description: 'Send a thoughtful message to a friend or family member.',
          },
        ],
      },
      {
        day: 4,
        title: 'Growth Mindset',
        tasks: [
          {
            id: 'balance-reset-d4-check_in-0',
            type: 'check_in',
            title: 'Daily check-in',
            description: 'Reflect on your personal growth.',
          },
          {
            id: 'balance-reset-d4-action-0',
            type: 'action',
            title: 'Learn something new',
            description: 'Spend 15 minutes reading or watching an educational video.',
          },
        ],
      },
      {
        day: 5,
        title: 'Financial Awareness',
        tasks: [
          {
            id: 'balance-reset-d5-check_in-0',
            type: 'check_in',
            title: 'Daily check-in',
            description: 'How do you feel about your finances?',
          },
          {
            id: 'balance-reset-d5-reflection-0',
            type: 'reflection',
            title: 'Money journal',
            description: 'Write about your relationship with money.',
          },
        ],
      },
      {
        day: 6,
        title: 'Career Reflection',
        tasks: [
          {
            id: 'balance-reset-d6-check_in-0',
            type: 'check_in',
            title: 'Daily check-in',
            description: 'How fulfilled are you at work?',
          },
          {
            id: 'balance-reset-d6-reflection-0',
            type: 'reflection',
            title: 'Career vision',
            description: 'What does your ideal work life look like in 1 year?',
          },
        ],
      },
      {
        day: 7,
        title: 'Integration',
        tasks: [
          {
            id: 'balance-reset-d7-check_in-0',
            type: 'check_in',
            title: 'Final check-in',
            description: 'Complete your last check-in and compare to Day 1.',
          },
          {
            id: 'balance-reset-d7-reflection-0',
            type: 'reflection',
            title: 'Week in review',
            description: 'What did you learn about yourself this week?',
          },
          {
            id: 'balance-reset-d7-score_target-0',
            type: 'score_target',
            title: 'Score all dimensions',
            description: 'Rate all 8 dimensions in your check-in.',
            target: { dimension: Dimension.Health, minScore: 1 },
          },
        ],
      },
    ],
    badge: {
      name: 'Balance Seeker',
      icon: '\u2696\uFE0F',
      description: 'Completed the Balance Reset challenge',
      color: 'var(--color-sage-500)',
    },
  },
  {
    id: 'fitness-kickstart',
    title: 'Fitness Kickstart',
    description:
      'Build a sustainable fitness habit with 5 days of escalating physical challenges.',
    dimensions: [Dimension.Fitness, Dimension.Health],
    difficulty: 'intermediate',
    durationDays: 5,
    days: [
      {
        day: 1,
        title: 'Get Moving',
        tasks: [
          {
            id: 'fitness-kickstart-d1-check_in-0',
            type: 'check_in',
            title: 'Fitness baseline',
            description: 'Rate your current fitness level honestly.',
          },
          {
            id: 'fitness-kickstart-d1-action-0',
            type: 'action',
            title: '15-minute workout',
            description: 'Do any form of exercise for at least 15 minutes.',
          },
        ],
      },
      {
        day: 2,
        title: 'Push Further',
        tasks: [
          {
            id: 'fitness-kickstart-d2-check_in-0',
            type: 'check_in',
            title: 'Daily check-in',
            description: 'How does your body feel?',
          },
          {
            id: 'fitness-kickstart-d2-action-0',
            type: 'action',
            title: '20-minute workout',
            description: 'Step it up with a 20-minute session.',
          },
        ],
      },
      {
        day: 3,
        title: 'Recovery Day',
        tasks: [
          {
            id: 'fitness-kickstart-d3-check_in-0',
            type: 'check_in',
            title: 'Daily check-in',
            description: 'Check in on your energy and soreness.',
          },
          {
            id: 'fitness-kickstart-d3-action-0',
            type: 'action',
            title: 'Stretch & recover',
            description: '15 minutes of stretching or yoga.',
          },
        ],
      },
      {
        day: 4,
        title: 'Intensity',
        tasks: [
          {
            id: 'fitness-kickstart-d4-check_in-0',
            type: 'check_in',
            title: 'Daily check-in',
            description: 'Rate your energy and fitness.',
          },
          {
            id: 'fitness-kickstart-d4-action-0',
            type: 'action',
            title: '25-minute workout',
            description: 'Push for your best session yet.',
          },
        ],
      },
      {
        day: 5,
        title: 'Celebrate',
        tasks: [
          {
            id: 'fitness-kickstart-d5-check_in-0',
            type: 'check_in',
            title: 'Final check-in',
            description: 'Reflect on how far you\'ve come.',
          },
          {
            id: 'fitness-kickstart-d5-action-0',
            type: 'action',
            title: '30-minute workout',
            description: 'Complete your final workout and celebrate!',
          },
          {
            id: 'fitness-kickstart-d5-reflection-0',
            type: 'reflection',
            title: 'Fitness journal',
            description: 'Write about your fitness journey and future plans.',
          },
        ],
      },
    ],
    badge: {
      name: 'Fitness Starter',
      icon: '\u{1F4AA}',
      description: 'Completed the Fitness Kickstart challenge',
      color: 'var(--color-sage-400)',
    },
  },
  {
    id: 'mindful-week',
    title: 'Mindful Week',
    description:
      'Cultivate mindfulness and emotional awareness through daily reflection and meditation practices.',
    dimensions: [Dimension.Health, Dimension.Growth],
    difficulty: 'beginner',
    durationDays: 7,
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}: ${['Awareness', 'Breath', 'Gratitude', 'Body Scan', 'Compassion', 'Letting Go', 'Integration'][i]}`,
      tasks: [
        {
          id: `mindful-week-d${i + 1}-check_in-0`,
          type: 'check_in' as const,
          title: 'Mindful check-in',
          description: 'Pause and rate how present you feel today.',
        },
        {
          id: `mindful-week-d${i + 1}-action-0`,
          type: 'action' as const,
          title: '10-minute meditation',
          description: `Focus on ${['awareness of thoughts', 'breathing patterns', 'things you\'re grateful for', 'body sensations', 'compassion for self and others', 'releasing what doesn\'t serve you', 'integrating your practice'][i]}.`,
        },
        {
          id: `mindful-week-d${i + 1}-reflection-0`,
          type: 'reflection' as const,
          title: 'Evening reflection',
          description: 'Write a short journal entry about your experience.',
        },
      ],
    })),
    badge: {
      name: 'Mindful Explorer',
      icon: '\u{1F9D8}',
      description: 'Completed the Mindful Week challenge',
      color: 'var(--color-dim-social)',
    },
  },
];

/**
 * Look up a challenge by its ID.
 */
export function getChallengeById(id: string): Challenge | undefined {
  return CHALLENGE_LIBRARY.find((c) => c.id === id);
}
