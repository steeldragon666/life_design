import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normaliseRawAnswers, computeAllDerivedScores, computePsychometricProfile } from '@life-design/core';
import { generateSummaryTemplate } from '@/lib/profiling/summary-templates';
import { savePsychometricProfile, generatePsychometricNarrative } from '@/lib/services/psychometric-service';

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get session
  const { data: session, error: fetchError } = await supabase
    .from('onboarding_sessions')
    .select('id, raw_answers, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError || !session) {
    return NextResponse.json({ error: 'No active session' }, { status: 404 });
  }

  if (session.status === 'completed') {
    return NextResponse.json({ error: 'Already completed' }, { status: 409 });
  }

  // Require at least half the questions answered to generate a meaningful profile
  const answerCount = Object.keys(session.raw_answers ?? {}).length;
  if (answerCount < 30) {
    return NextResponse.json(
      { error: 'Please complete more questions before finishing.' },
      { status: 400 },
    );
  }

  // Normalise and score
  const normalised = normaliseRawAnswers(session.raw_answers ?? {});
  const derived = computeAllDerivedScores(normalised);
  const summaryTemplate = generateSummaryTemplate(normalised, derived);

  // Score psychometric instruments
  const psychometricResponses: Record<string, number> = {};
  for (const [key, value] of Object.entries(session.raw_answers)) {
    if (key.startsWith('perma_') || key.startsWith('tipi_') || key.startsWith('grit_') || key.startsWith('swls_') || key.startsWith('bpns_')) {
      psychometricResponses[key] = Number(value);
    }
  }

  let psychometricProfile = null;
  let narrativeSummary = '';

  if (Object.keys(psychometricResponses).length >= 25) {
    psychometricProfile = computePsychometricProfile(psychometricResponses);

    // Generate AI narrative (non-blocking, don't fail onboarding if this errors)
    try {
      narrativeSummary = await generatePsychometricNarrative(psychometricProfile);
    } catch (err) {
      console.error('Failed to generate psychometric narrative:', err);
    }

    // Save to database (non-critical)
    const { error: psychError } = await savePsychometricProfile(
      user.id,
      psychometricProfile,
      psychometricResponses,
      narrativeSummary,
    );
    if (psychError) {
      console.error('Failed to save psychometric profile:', psychError);
    }
  }

  // Create user_profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      ...normalised,
      ...derived,
      summary_template: summaryTemplate,
      source_mix: { onboarding: 1.0, behaviour: 0.0 },
      profile_confidence: 1.0,
    }, { onConflict: 'user_id' });

  if (profileError) {
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }

  // Mark session as completed
  const { error: sessionUpdateError } = await supabase
    .from('onboarding_sessions')
    .update({
      status: 'completed',
      normalized_answers: normalised,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  if (sessionUpdateError) {
    console.error('Failed to update onboarding session:', sessionUpdateError);
  }

  // Update profiles.onboarding_status — critical for middleware redirect logic
  const { error: profilesUpdateError } = await supabase
    .from('profiles')
    .update({ onboarding_status: 'completed' })
    .eq('id', user.id);

  if (profilesUpdateError) {
    console.error('Failed to update profiles.onboarding_status:', profilesUpdateError);
    return NextResponse.json({ error: 'Failed to mark onboarding as completed' }, { status: 500 });
  }

  // Create initial snapshot (non-critical)
  const { error: snapshotError } = await supabase
    .from('profile_snapshots')
    .insert({
      user_id: user.id,
      feature_vector: normalised,
      source_weights: { onboarding: 1.0, behaviour: 0.0 },
      risk_scores: { dropout_risk: derived.dropout_risk_initial, goal_success: derived.goal_success_prior },
    });

  if (snapshotError) {
    console.error('Failed to create profile snapshot:', snapshotError);
  }

  // Record onboarding_completed event (non-critical)
  const { error: eventError } = await supabase
    .from('behavior_events')
    .insert({
      user_id: user.id,
      event_type: 'onboarding_completed',
      metadata: { question_count: Object.keys(session.raw_answers).length },
    });

  if (eventError) {
    console.error('Failed to record onboarding_completed event:', eventError);
  }

  // Data minimization: only return the summary template needed for the UI.
  // Full profile and psychometric data are persisted server-side and should
  // not transit to the client unnecessarily (sensitive health/personality data).
  return NextResponse.json({
    summary: summaryTemplate,
  });
}
