import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const EMBEDDING_DIM = 384;

async function computeEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? '';
  if (!apiKey) return new Array(EMBEDDING_DIM).fill(0);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values.slice(0, EMBEDDING_DIM);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { query, limit = 5, excludeId } = body as {
    query: string;
    limit?: number;
    excludeId?: string;
  };

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const embedding = await computeEmbedding(query.trim());

  const { data, error } = await supabase.rpc('find_similar_journal_entries', {
    p_user_id: user.id,
    p_embedding: JSON.stringify(embedding),
    p_limit: Math.min(limit, 20),
    p_exclude_id: excludeId ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
