import { evaluateJITAIRules } from '@life-design/core';
import type { JITAIContext, JITAIDecision } from '@life-design/core';

export interface LocalJITAIInput {
  recentMood?: number | null;
  sleepQuality?: number | null;
  lastCheckinHoursAgo?: number | null;
  streakDays?: number;
  /** Future: these will come from device sensors/IndexedDB */
  activityLevel?: JITAIContext['activityLevel'];
  calendarDensity?: JITAIContext['calendarDensity'];
  hrvStressLevel?: JITAIContext['hrvStressLevel'];
}

export function getTimeOfDay(): JITAIContext['timeOfDay'] {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Thin client-side wrapper around evaluateJITAIRules.
 * Builds a complete JITAIContext from partial/raw device data,
 * then delegates to the rule engine for instant responsiveness.
 *
 * Future iterations will replace rule-based evaluation with an ONNX model.
 */
export function runLocalJITAI(input: LocalJITAIInput): JITAIDecision {
  const ctx: JITAIContext = {
    timeOfDay: getTimeOfDay(),
    recentMood: input.recentMood ?? null,
    sleepQuality: input.sleepQuality ?? null,
    activityLevel: input.activityLevel ?? null,
    calendarDensity: input.calendarDensity ?? null,
    lastCheckinHoursAgo: input.lastCheckinHoursAgo ?? null,
    streakDays: input.streakDays ?? 0,
    hrvStressLevel: input.hrvStressLevel ?? null,
  };

  return evaluateJITAIRules(ctx);
}
