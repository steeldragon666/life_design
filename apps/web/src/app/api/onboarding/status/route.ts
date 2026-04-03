import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: session } = await supabase
    .from('onboarding_sessions')
    .select('id, status, current_section, current_step, raw_answers')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ status: 'not_started' });
  }

  return NextResponse.json({
    status: session.status,
    session_id: session.id,
    current_section: session.current_section,
    current_step: session.current_step,
    raw_answers: session.raw_answers,
    answered_count: Object.keys(session.raw_answers).length,
  });
}
