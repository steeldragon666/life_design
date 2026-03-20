import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normaliseRawAnswers, computeAllDerivedScores } from '@life-design/core';
import { generateSummaryTemplate } from '@/lib/profiling/summary-templates';

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

  // Normalise and score
  const normalised = normaliseRawAnswers(session.raw_answers);
  const derived = computeAllDerivedScores(normalised);
  const summaryTemplate = generateSummaryTemplate(normalised, derived);

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
  await supabase
    .from('onboarding_sessions')
    .update({
      status: 'completed',
      normalized_answers: normalised,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  // Update profiles.onboarding_status
  await supabase
    .from('profiles')
    .update({ onboarding_status: 'completed' })
    .eq('id', user.id);

  // Create initial snapshot
  await supabase
    .from('profile_snapshots')
    .insert({
      user_id: user.id,
      feature_vector: normalised,
      source_weights: { onboarding: 1.0, behaviour: 0.0 },
      risk_scores: { dropout_risk: derived.dropout_risk_initial, goal_success: derived.goal_success_prior },
    });

  // Record onboarding_completed event
  await supabase
    .from('behavior_events')
    .insert({
      user_id: user.id,
      event_type: 'onboarding_completed',
      metadata: { question_count: Object.keys(session.raw_answers).length },
    });

  return NextResponse.json({
    profile: { ...normalised, ...derived },
    summary: summaryTemplate,
  });
}
