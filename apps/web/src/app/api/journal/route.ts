import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createJournalEntry, getJournalEntries } from '@/lib/services/journal-service';
import { analyzeJournalEntryAI } from '@/lib/services/journal-analysis-service';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const { data, error } = await getJournalEntries(user.id, {
    source: (params.get('source') as 'standalone' | 'checkin') || undefined,
    startDate: params.get('startDate') || undefined,
    endDate: params.get('endDate') || undefined,
    limit: params.get('limit') ? Number(params.get('limit')) : 50,
    offset: params.get('offset') ? Number(params.get('offset')) : 0,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const { data, error } = await createJournalEntry(user.id, {
    content: content.trim(),
    source: 'standalone',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget: analyze journal entry
  if (data) {
    analyzeJournalEntryAI(content.trim()).then(async (analysis) => {
      const { updateJournalEntry } = await import('@/lib/services/journal-service');
      await updateJournalEntry(data.id, {
        sentiment: analysis.sentiment,
        themes: analysis.themes,
        dimensions: analysis.dimensions,
      });
    }).catch((err) => console.error('Journal analysis failed:', err));
  }

  return NextResponse.json({ data }, { status: 201 });
}
