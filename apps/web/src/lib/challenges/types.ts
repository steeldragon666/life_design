// ---------------------------------------------------------------------------
// Challenge Type Definitions
// ---------------------------------------------------------------------------
// Shared types for the challenge system.
// ---------------------------------------------------------------------------

import type { Dimension } from '@life-design/core';

export interface ChallengeTask {
  id: string;
  type: 'check_in' | 'action' | 'reflection' | 'score_target';
  title: string;
  description: string;
  /** For score_target tasks, the dimension and minimum score required */
  target?: {
    dimension: Dimension;
    minScore: number;
  };
}

export interface ChallengeDay {
  day: number;
  title: string;
  tasks: ChallengeTask[];
}

export interface ChallengeBadge {
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  dimensions: Dimension[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationDays: number;
  days: ChallengeDay[];
  badge: ChallengeBadge;
}

export interface ChallengeProgress {
  percentage: number;
  completedTasks: number;
  totalTasks: number;
  completedDays: number;
  totalDays: number;
}

export interface TodaysTasks {
  day: ChallengeDay;
  tasks: ChallengeTask[];
}
