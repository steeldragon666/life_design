import type { JITAIContext, JITAIDecision } from './types';

export function evaluateJITAIRules(ctx: JITAIContext): JITAIDecision {
  // Rule 1: High stress = breathing exercise (fires at any time of day)
  if (ctx.hrvStressLevel === 'high') {
    return {
      shouldIntervene: true,
      interventionType: 'breathing_exercise',
      urgency: 'high',
      content: {
        title: 'Take a moment',
        message: 'Your stress levels are elevated. A 2-minute breathing exercise can help.',
        actionUrl: '/meditations',
      },
      reasoning: 'High HRV stress detected — breathing exercise recommended',
    };
  }

  // Rule 2: No check-in for 24h+ and it's evening
  if (ctx.lastCheckinHoursAgo !== null && ctx.lastCheckinHoursAgo > 24 && ctx.timeOfDay === 'evening') {
    return {
      shouldIntervene: true,
      interventionType: 'checkin_prompt',
      urgency: 'medium',
      content: {
        title: 'Daily reflection',
        message: 'A quick check-in helps track your progress. Just takes a minute.',
        actionUrl: '/checkin',
      },
      reasoning: 'No check-in for 24h+ and it is evening',
    };
  }

  // Rule 3: Low mood + sedentary = activity suggestion
  if (ctx.recentMood !== null && ctx.recentMood <= 2 && ctx.activityLevel === 'sedentary') {
    return {
      shouldIntervene: true,
      interventionType: 'activity_suggestion',
      urgency: 'medium',
      content: {
        title: 'Movement helps',
        message: 'Even a short walk can shift your mood. Research shows 10 minutes makes a difference.',
      },
      reasoning: 'Low mood combined with sedentary activity level',
    };
  }

  // Rule 4: Packed calendar + no check-in = gentle nudge
  if (ctx.calendarDensity === 'packed' && ctx.lastCheckinHoursAgo !== null && ctx.lastCheckinHoursAgo > 12) {
    return {
      shouldIntervene: true,
      interventionType: 'nudge',
      urgency: 'low',
      content: {
        title: 'Busy day?',
        message: 'Even on packed days, a 30-second check-in helps you stay connected to how you feel.',
        actionUrl: '/checkin',
      },
      reasoning: 'Packed calendar with no recent check-in',
    };
  }

  // Rule 5: SAD risk → light therapy suggestion
  if (ctx.sadRisk === true) {
    return {
      shouldIntervene: true,
      interventionType: 'light_therapy',
      urgency: 'medium',
      content: {
        title: 'Low light alert',
        message: 'Seasonal light levels are low. Try getting outdoors or using a bright light to boost your mood.',
      },
      reasoning: 'SAD risk detected — light therapy or outdoor exposure recommended',
    };
  }

  // Rule 8: Screen time sleep risk + evening → digital sunset
  if (ctx.screenTimeSleepRisk === true && ctx.timeOfDay === 'evening') {
    return {
      shouldIntervene: true,
      interventionType: 'digital_sunset',
      urgency: 'medium',
      content: {
        title: 'Digital sunset',
        message: 'Your late-night screen time has been high recently. Consider putting your phone away to protect your sleep.',
      },
      reasoning: 'Screen time sleep disruption risk detected in the evening — digital sunset recommended',
    };
  }

  // Rule 6: Bad weather + low mood → indoor activity suggestion
  if (ctx.weatherMoodImpact !== null && ctx.weatherMoodImpact < -0.3 && ctx.recentMood !== null && ctx.recentMood <= 2) {
    return {
      shouldIntervene: true,
      interventionType: 'activity_suggestion',
      urgency: 'low',
      content: {
        title: 'Indoor day',
        message: 'The weather may be affecting your mood. Try an indoor hobby or activity you enjoy.',
      },
      reasoning: 'Negative weather mood impact combined with low mood — indoor activity suggested',
    };
  }

  // Rule 7: Social isolation risk → social nudge
  if (ctx.socialIsolationRisk === true) {
    return {
      shouldIntervene: true,
      interventionType: 'nudge',
      urgency: 'medium',
      content: {
        title: 'Stay connected',
        message: 'It looks like you haven\'t connected with anyone recently. Consider reaching out to a friend or loved one.',
      },
      reasoning: 'Social isolation risk detected — encouraging social connection',
    };
  }

  return {
    shouldIntervene: false,
    interventionType: 'none',
    urgency: 'low',
    content: null,
    reasoning: 'No intervention rules matched',
  };
}
