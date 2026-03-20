import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { question_id, answer, current_section, current_step } = body;

  if (!question_id || answer === undefined) {
    return NextResponse.json({ error: 'Missing question_id or answer' }, { status: 400 });
  }

  // Get current session
  const { data: session, error: fetchError } = await supabase
    .from('onboarding_sessions')
    .select('id, raw_answers, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError || !session) {
    return NextResponse.json({ error: 'No active session' }, { status: 404 });
  }

  if (session.status === 'completed') {
    return NextResponse.json({ error: 'Session already completed' }, { status: 409 });
  }

  // Merge answer into raw_answers
  const updatedAnswers = { ...session.raw_answers, [question_id]: answer };

  const { error: updateError } = await supabase
    .from('onboarding_sessions')
    .update({
      raw_answers: updatedAnswers,
      current_section: current_section ?? undefined,
      current_step: current_step ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
