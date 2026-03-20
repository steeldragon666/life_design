import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check for existing session
  const { data: existing } = await supabase
    .from('onboarding_sessions')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing?.status === 'completed') {
    return NextResponse.json({ error: 'Onboarding already completed' }, { status: 409 });
  }

  if (existing) {
    // Resume existing session
    return NextResponse.json({ session_id: existing.id, resumed: true });
  }

  // Create new session
  const { data: session, error } = await supabase
    .from('onboarding_sessions')
    .insert({ user_id: user.id })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  return NextResponse.json({ session_id: session.id, resumed: false }, { status: 201 });
}
