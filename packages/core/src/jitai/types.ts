export interface JITAIContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  recentMood: number | null; // 1-5 scale
  sleepQuality: number | null; // 1-5
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | null;
  calendarDensity: 'empty' | 'light' | 'moderate' | 'packed' | null;
  lastCheckinHoursAgo: number | null;
  streakDays: number;
  hrvStressLevel: 'low' | 'moderate' | 'high' | null;
  weatherMoodImpact: number | null;  // -1 to 1 from weather features
  sadRisk: boolean;                   // from weather trend
  outdoorFriendly: boolean | null;    // from weather features
  socialIsolationRisk: boolean;       // from social density
  screenTimeCompulsive: boolean;      // from phenotype.highCompulsiveUse
  screenTimeSleepRisk: boolean;       // from phenotype.sleepDisruptionRisk
}

export interface JITAIDecision {
  shouldIntervene: boolean;
  interventionType: 'nudge' | 'checkin_prompt' | 'breathing_exercise' | 'activity_suggestion' | 'light_therapy' | 'digital_sunset' | 'none';
  urgency: 'low' | 'medium' | 'high';
  content: {
    title: string;
    message: string;
    actionUrl?: string;
  } | null;
  reasoning: string;
  contextSnapshot?: Partial<JITAIContext>;  // snapshot of inputs for debugging
  evaluatedAt?: string;                      // ISO timestamp
}
