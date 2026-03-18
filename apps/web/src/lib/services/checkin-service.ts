import { createClient } from '@/lib/supabase/server';
import type { Dimension, DurationType } from '@life-design/core';

/**
 * Persist the journal embedding via the /api/embeddings route.
 * Fire-and-forget — embedding failures never block the checkin save.
 * We call the API route rather than importing ai-local directly to avoid
 * pulling onnxruntime-node native binaries into the server action bundle.
 */
async function persistJournalEmbedding(checkinId: string): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkin_id: checkinId }),
    });
  } catch (err) {
    console.warn('[checkin-service] Embedding persistence failed:', err);
  }
}

export interface CreateCheckInInput {
  date: string;
  mood: number;
  durationType: DurationType;
  journalEntry?: string;
  scores: { dimension: Dimension; score: number; note?: string }[];
}

export interface UpdateCheckInInput {
  mood?: number;
  journalEntry?: string;
}

export async function createCheckIn(
  userId: string,
  input: CreateCheckInInput,
) {
  const supabase = await createClient();

  const { data: checkin, error: checkinError } = await supabase
    .from('checkins')
    .insert({
      user_id: userId,
      date: input.date,
      mood: input.mood,
      duration_type: input.durationType,
      journal_entry: input.journalEntry ?? null,
    })
    .select()
    .single();

  if (checkinError) {
    return { data: null, error: checkinError.message };
  }

  if (input.scores.length > 0) {
    const scoreRows = input.scores.map((s) => ({
      checkin_id: checkin.id,
      dimension: s.dimension,
      score: s.score,
      note: s.note ?? null,
    }));

    const { error: scoresError } = await supabase
      .from('dimension_scores')
      .insert(scoreRows);

    if (scoresError) {
      return { data: null, error: scoresError.message };
    }
  }

  // Fire-and-forget: compute and persist the journal embedding
  if (input.journalEntry && input.journalEntry.trim().length > 0) {
    persistJournalEmbedding(checkin.id).catch(() => {});
  }

  return { data: checkin, error: null };
}

export async function getCheckInByDate(userId: string, date: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checkins')
    .select('*, dimension_scores(*)')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  // PGRST116 = no rows returned — not an error for our use case
  if (error && error.code === 'PGRST116') {
    return { data: null, error: null };
  }

  return { data, error: error ? error.message : null };
}

export async function getRecentCheckIns(userId: string, limit: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checkins')
    .select('*, dimension_scores(*)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  return { data, error: error ? error.message : null };
}

export async function updateCheckIn(
  checkinId: string,
  input: UpdateCheckInInput,
) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (input.mood !== undefined) updates.mood = input.mood;
  if (input.journalEntry !== undefined) updates.journal_entry = input.journalEntry;

  const { data, error } = await supabase
    .from('checkins')
    .update(updates)
    .eq('id', checkinId)
    .select()
    .single();

  return { data, error: error ? error.message : null };
}
