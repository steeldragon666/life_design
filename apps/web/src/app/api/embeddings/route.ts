/**
 * POST /api/embeddings
 *
 * Server-side embedding persistence pipeline.
 *
 * Accepts a checkin_id (and optionally a goal_id), computes a 384-dim
 * embedding vector using Google's text-embedding model, and persists it
 * to the corresponding pgvector column in Supabase.
 *
 * This closes the gap where client-side embeddings were computed for
 * similarity search but never written back to the database.
 *
 * We use the Gemini embedding API server-side instead of the local
 * @life-design/ai-local package because the latter pulls in
 * onnxruntime-node native binaries that fail Next.js webpack builds.
 * The local package remains available for client-side (Web Worker) use.
 *
 * Request body:
 *   { checkin_id?: string, goal_id?: string }
 *
 * At least one of checkin_id or goal_id must be provided.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const EMBEDDING_DIM = 384;

/**
 * Compute a 384-dim embedding using Google's text-embedding-004 model.
 * Falls back to a zero vector on failure.
 */
async function computeEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? '';
  if (!apiKey) {
    console.warn('[embeddings] No GEMINI_API_KEY configured — returning zero vector');
    return new Array(EMBEDDING_DIM).fill(0);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  const values = result.embedding.values;

  // text-embedding-004 returns 768-dim; truncate to 384 to match pgvector schema
  return values.slice(0, EMBEDDING_DIM);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { checkin_id, goal_id } = body as {
      checkin_id?: string;
      goal_id?: string;
    };

    if (!checkin_id && !goal_id) {
      return NextResponse.json(
        { error: 'At least one of checkin_id or goal_id is required' },
        { status: 400 }
      );
    }

    const results: Record<string, boolean> = {};

    // --- Checkin embedding ---
    if (checkin_id) {
      const { data: checkin, error: fetchError } = await supabase
        .from('checkins')
        .select('id, journal_entry, user_id')
        .eq('id', checkin_id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !checkin) {
        return NextResponse.json(
          { error: 'Checkin not found or access denied' },
          { status: 404 }
        );
      }

      if (checkin.journal_entry && checkin.journal_entry.trim().length > 0) {
        const embedding = await computeEmbedding(checkin.journal_entry);

        const { error: updateError } = await supabase
          .from('checkins')
          .update({ journal_embedding: JSON.stringify(embedding) })
          .eq('id', checkin_id);

        if (updateError) {
          console.error('[embeddings] Failed to persist checkin embedding:', updateError.message);
          results.checkin = false;
        } else {
          results.checkin = true;
        }
      } else {
        results.checkin = false;
      }
    }

    // --- Goal embedding ---
    if (goal_id) {
      const { data: goal, error: fetchError } = await supabase
        .from('goals')
        .select('id, title, user_id')
        .eq('id', goal_id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !goal) {
        return NextResponse.json(
          { error: 'Goal not found or access denied' },
          { status: 404 }
        );
      }

      if (goal.title && goal.title.trim().length > 0) {
        const embedding = await computeEmbedding(goal.title);

        const { error: updateError } = await supabase
          .from('goals')
          .update({ title_embedding: JSON.stringify(embedding) })
          .eq('id', goal_id);

        if (updateError) {
          console.error('[embeddings] Failed to persist goal embedding:', updateError.message);
          results.goal = false;
        } else {
          results.goal = true;
        }
      } else {
        results.goal = false;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[embeddings] Pipeline error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
