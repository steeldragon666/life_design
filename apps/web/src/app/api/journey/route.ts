import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJourneyNarrative, generateJourneyNarrative } from '@/lib/services/journey-service';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const narrative = await getJourneyNarrative(user.id);
  return NextResponse.json({ data: narrative });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: allow regeneration at most once per day
  const existing = await getJourneyNarrative(user.id);
  if (existing) {
    const lastGenerated = new Date(existing.generatedAt);
    const hoursSince = (Date.now() - lastGenerated.getTime()) / 3600000;
    if (hoursSince < 24) {
      return NextResponse.json(
        { error: 'Journey narrative can only be regenerated once per day', data: existing },
        { status: 429 },
      );
    }
  }

  const narrative = await generateJourneyNarrative(user.id);
  return NextResponse.json({ data: narrative }, { status: 201 });
}
