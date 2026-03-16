// ---------------------------------------------------------------------------
// Badge Definitions
// ---------------------------------------------------------------------------
// Defines all unlockable badges and their criteria. The BadgeSystem evaluates
// these definitions against user data to determine which badges are earned.
// ---------------------------------------------------------------------------

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'streak' | 'milestone' | 'exploration' | 'special';
  criteria: {
    type: 'checkin_count' | 'streak_days' | 'dimension_score' | 'all_dimensions' | 'journal_count';
    threshold: number;
    /** Optional dimension filter for dimension-specific badges */
    dimension?: string;
  };
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // --- Milestone badges ---
  {
    id: 'first-checkin',
    name: 'First Step',
    description: 'Complete your first check-in',
    emoji: '\u{1F331}',
    category: 'milestone',
    criteria: { type: 'checkin_count', threshold: 1 },
  },
  {
    id: 'ten-checkins',
    name: 'Getting Started',
    description: 'Complete 10 check-ins',
    emoji: '\u{1F4CB}',
    category: 'milestone',
    criteria: { type: 'checkin_count', threshold: 10 },
  },
  {
    id: 'fifty-checkins',
    name: 'Committed',
    description: 'Complete 50 check-ins',
    emoji: '\u{1F3C6}',
    category: 'milestone',
    criteria: { type: 'checkin_count', threshold: 50 },
  },
  {
    id: 'hundred-checkins',
    name: 'Centurion',
    description: 'Complete 100 check-ins',
    emoji: '\u{1F4AF}',
    category: 'milestone',
    criteria: { type: 'checkin_count', threshold: 100 },
  },

  // --- Streak badges ---
  {
    id: 'three-day-streak',
    name: 'Momentum',
    description: '3-day check-in streak',
    emoji: '\u{26A1}',
    category: 'streak',
    criteria: { type: 'streak_days', threshold: 3 },
  },
  {
    id: 'week-streak',
    name: 'Week Warrior',
    description: '7-day check-in streak',
    emoji: '\u{1F525}',
    category: 'streak',
    criteria: { type: 'streak_days', threshold: 7 },
  },
  {
    id: 'two-week-streak',
    name: 'Fortnight Focus',
    description: '14-day check-in streak',
    emoji: '\u{1F31F}',
    category: 'streak',
    criteria: { type: 'streak_days', threshold: 14 },
  },
  {
    id: 'month-streak',
    name: 'Monthly Master',
    description: '30-day check-in streak',
    emoji: '\u{2B50}',
    category: 'streak',
    criteria: { type: 'streak_days', threshold: 30 },
  },

  // --- Exploration badges ---
  {
    id: 'all-dimensions',
    name: 'Well-Rounded',
    description: 'Score all 8 dimensions in a single check-in',
    emoji: '\u{1F308}',
    category: 'exploration',
    criteria: { type: 'all_dimensions', threshold: 8 },
  },
  {
    id: 'journal-five',
    name: 'Reflective Mind',
    description: 'Write 5 journal entries',
    emoji: '\u{1F4DD}',
    category: 'exploration',
    criteria: { type: 'journal_count', threshold: 5 },
  },
  {
    id: 'journal-twenty',
    name: 'Deep Thinker',
    description: 'Write 20 journal entries',
    emoji: '\u{1F9E0}',
    category: 'exploration',
    criteria: { type: 'journal_count', threshold: 20 },
  },

  // --- Special badges ---
  {
    id: 'high-mood',
    name: 'Peak Day',
    description: 'Record a mood of 9 or higher',
    emoji: '\u{2600}\u{FE0F}',
    category: 'special',
    criteria: { type: 'dimension_score', threshold: 9, dimension: 'mood' },
  },
];
