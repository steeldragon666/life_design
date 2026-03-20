import type { NormalisedProfile, DerivedScores, ProfileSummaryTemplate } from '@life-design/core';

export function generateSummaryTemplate(
  profile: NormalisedProfile,
  scores: DerivedScores,
): ProfileSummaryTemplate {
  return {
    strength: pickStrength(profile, scores),
    friction: pickFriction(profile, scores),
    strategy: pickStrategy(profile, scores),
    this_week: pickThisWeek(profile, scores),
  };
}

function pickStrength(profile: NormalisedProfile, scores: DerivedScores): string {
  if (scores.discipline_index > 0.7) return 'Strong follow-through when you commit';
  if (profile.goal_importance > 0.8) return 'You care deeply about meaningful goals';
  if (profile.motivation_type === 'progress') return "You're driven by visible progress";
  if (profile.motivation_type === 'curiosity') return 'Your natural curiosity keeps you exploring';
  if (profile.motivation_type === 'accountability') return 'You thrive with accountability and shared commitment';
  if (profile.self_efficacy > 0.7) return 'Strong self-belief powers your ambitions';
  if (profile.action_orientation > 0.7) return "You're a natural action-taker";
  return 'You have the awareness to reflect on what matters';
}

function pickFriction(profile: NormalisedProfile, scores: DerivedScores): string {
  if (scores.friction_index > 0.65) return 'Stress and high load erode your consistency';
  if (profile.recovery_resilience < 0.4) return 'Missing a day tends to spiral';
  if (profile.execution_consistency < 0.4) return 'Following through on plans is a challenge';
  if (profile.life_load > 0.7) return 'Too many commitments compete for your attention';
  if (profile.stress_load > 0.7) return 'Stress drains the energy you need for your goals';
  if (profile.energy_level < 0.35) return 'Low energy makes it hard to start';
  return 'Minor friction points — mostly manageable with the right structure';
}

function pickStrategy(profile: NormalisedProfile, scores: DerivedScores): string {
  if (scores.structure_need > 0.6 && profile.chronotype === 'early_morning')
    return 'Morning routines with clear structure will anchor your progress';
  if (scores.structure_need > 0.6)
    return 'You need clear daily structure — small commitments with visible checkpoints';
  if (profile.motivation_type === 'accountability')
    return 'Regular check-ins and accountability loops will keep you on track';
  if (profile.motivation_type === 'rewards')
    return 'Short reward cycles and milestone celebrations will sustain your drive';
  if (profile.delay_discounting_score < 0.5)
    return 'Quick wins and immediate feedback loops match how you stay engaged';
  if (scores.discipline_index > 0.7)
    return 'Build on your strong habits — add one new micro-habit at a time';
  return 'Start small, measure often, and adjust as you learn what works';
}

function pickThisWeek(profile: NormalisedProfile, scores: DerivedScores): string {
  if (scores.dropout_risk_initial > 0.6)
    return 'This week: one tiny daily action. Just show up — consistency beats intensity';
  if (scores.friction_index > 0.6)
    return 'This week: reduce one commitment and protect 30 minutes of focused time daily';
  if (profile.chronotype === 'early_morning')
    return 'This week: set one morning anchor habit and track it for 7 days';
  if (profile.chronotype === 'evening' || profile.chronotype === 'late_night')
    return 'This week: plan tomorrow each evening and batch your hardest task after dinner';
  if (scores.discipline_index > 0.7)
    return 'This week: pick your top goal, break it into 3 steps, and complete step 1';
  return 'This week: check in daily and notice what patterns emerge';
}
