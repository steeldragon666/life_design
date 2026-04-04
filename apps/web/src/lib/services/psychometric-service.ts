import { createClient } from '@/lib/supabase/server';
import type { PsychometricProfile } from '@life-design/core';

export async function getPsychometricProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('psychometric_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

export async function savePsychometricProfile(
  userId: string,
  profile: PsychometricProfile,
  rawResponses: Record<string, number>,
  narrativeSummary?: string,
) {
  const supabase = await createClient();

  // Get current version
  const { data: existing } = await supabase
    .from('psychometric_profiles')
    .select('version')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (existing?.version ?? 0) + 1;

  const { data, error } = await supabase
    .from('psychometric_profiles')
    .insert({
      user_id: userId,
      version,
      perma_positive_emotion: profile.perma.positiveEmotion,
      perma_engagement: profile.perma.engagement,
      perma_relationships: profile.perma.relationships,
      perma_meaning: profile.perma.meaning,
      perma_accomplishment: profile.perma.accomplishment,
      perma_overall: profile.perma.overall,
      tipi_extraversion: profile.tipi.extraversion,
      tipi_agreeableness: profile.tipi.agreeableness,
      tipi_conscientiousness: profile.tipi.conscientiousness,
      tipi_emotional_stability: profile.tipi.emotionalStability,
      tipi_openness: profile.tipi.openness,
      grit_perseverance: profile.grit.perseverance,
      grit_consistency: profile.grit.consistency,
      grit_overall: profile.grit.overall,
      swls_score: profile.swls.score,
      swls_band: profile.swls.band,
      bpns_autonomy: profile.bpns.autonomy,
      bpns_competence: profile.bpns.competence,
      bpns_relatedness: profile.bpns.relatedness,
      raw_responses: rawResponses,
      narrative_summary: narrativeSummary ?? null,
    })
    .select()
    .single();

  return { data, error };
}

export async function generatePsychometricNarrative(
  profile: PsychometricProfile,
): Promise<string> {
  // Use Google Generative AI (Gemini 1.5 Flash) - already configured in the app
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return buildFallbackNarrative(profile);
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a personal development coach. Generate a warm, encouraging 2-3 paragraph narrative summary connecting this person's psychometric profile to actionable life design insights. Write in second person ("You..."). Be specific about what the scores mean.

PERMA Wellbeing (0-10 scale):
- Positive Emotion: ${profile.perma.positiveEmotion.toFixed(1)}
- Engagement: ${profile.perma.engagement.toFixed(1)}
- Relationships: ${profile.perma.relationships.toFixed(1)}
- Meaning: ${profile.perma.meaning.toFixed(1)}
- Accomplishment: ${profile.perma.accomplishment.toFixed(1)}
- Overall: ${profile.perma.overall.toFixed(1)}

Big Five Personality (1-7 scale):
- Extraversion: ${profile.tipi.extraversion.toFixed(1)}
- Agreeableness: ${profile.tipi.agreeableness.toFixed(1)}
- Conscientiousness: ${profile.tipi.conscientiousness.toFixed(1)}
- Emotional Stability: ${profile.tipi.emotionalStability.toFixed(1)}
- Openness: ${profile.tipi.openness.toFixed(1)}

Grit (1-5 scale):
- Perseverance: ${profile.grit.perseverance.toFixed(1)}
- Consistency of Interest: ${profile.grit.consistency.toFixed(1)}
- Overall: ${profile.grit.overall.toFixed(1)}

Life Satisfaction (SWLS): ${profile.swls.score.toFixed(1)}/7 (${profile.swls.band.replace(/_/g, ' ')})

Basic Psychological Needs (1-7 scale):
- Autonomy: ${profile.bpns.autonomy.toFixed(1)}
- Competence: ${profile.bpns.competence.toFixed(1)}
- Relatedness: ${profile.bpns.relatedness.toFixed(1)}

Focus on: (1) their key strengths, (2) areas that could use attention, (3) how their personality traits connect to goal achievement. Keep it under 200 words.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Failed to generate psychometric narrative:', error);
    return buildFallbackNarrative(profile);
  }
}

function buildFallbackNarrative(profile: PsychometricProfile): string {
  const strengths: string[] = [];
  const areas: string[] = [];

  if (profile.perma.overall >= 7) strengths.push('high overall wellbeing');
  else if (profile.perma.overall < 5) areas.push('overall wellbeing');

  if (profile.grit.overall >= 3.5) strengths.push('strong grit and perseverance');
  else if (profile.grit.overall < 2.5) areas.push('consistency and follow-through');

  if (profile.tipi.conscientiousness >= 5) strengths.push('natural discipline');
  if (profile.tipi.openness >= 5) strengths.push('openness to new experiences');

  if (profile.bpns.autonomy < 4) areas.push('sense of autonomy');
  if (profile.bpns.competence < 4) areas.push('feeling of competence');
  if (profile.bpns.relatedness < 4) areas.push('social connection');

  const strengthText = strengths.length > 0
    ? `Your profile shows ${strengths.join(', ')}.`
    : 'Your profile reveals a balanced foundation to build from.';

  const areaText = areas.length > 0
    ? `Areas that could benefit from attention include ${areas.join(', ')}.`
    : '';

  return `${strengthText} ${areaText} Your Life Design journey is tailored to build on these insights.`.trim();
}
