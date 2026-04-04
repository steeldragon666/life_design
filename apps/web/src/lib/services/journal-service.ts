import { createClient } from '@/lib/supabase/server';
import type { Dimension } from '@life-design/core';

export interface CreateJournalInput {
  content: string;
  source: 'standalone' | 'checkin';
  checkinId?: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  source: 'standalone' | 'checkin';
  checkin_id: string | null;
  sentiment: number | null;
  themes: string[] | null;
  dimensions: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface JournalFilters {
  source?: 'standalone' | 'checkin';
  dimensions?: Dimension[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function createJournalEntry(userId: string, input: CreateJournalInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      content: input.content,
      source: input.source,
      checkin_id: input.checkinId ?? null,
    })
    .select()
    .single();

  return { data, error };
}

export async function getJournalEntries(userId: string, filters?: JournalFilters) {
  const supabase = await createClient();
  let query = supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.source) {
    query = query.eq('source', filters.source);
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters?.dimensions && filters.dimensions.length > 0) {
    query = query.overlaps('dimensions', filters.dimensions);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters?.limit ?? 20) - 1);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function getJournalEntry(entryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', entryId)
    .single();

  return { data, error };
}

export async function updateJournalEntry(
  entryId: string,
  updates: Partial<Pick<JournalEntry, 'content' | 'sentiment' | 'themes' | 'dimensions'>>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('journal_entries')
    .update(updates)
    .eq('id', entryId)
    .select()
    .single();

  return { data, error };
}

export async function deleteJournalEntry(entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entryId);

  return { error };
}

export async function getJournalStreak(userId: string): Promise<{ current: number; longest: number }> {
  const supabase = await createClient();

  // Get all journal entry dates in the last 365 days
  const { data } = await supabase
    .from('journal_entries')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (!data || data.length === 0) return { current: 0, longest: 0 };

  // Get unique dates
  const dates = [...new Set(data.map((e) => e.created_at.split('T')[0]))].sort().reverse();

  let current = 0;
  let longest = 0;
  let streak = 1;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Current streak: starts from today or yesterday
  if (dates[0] === today || dates[0] === yesterday) {
    current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (Math.round(diff) === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Longest streak
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak, current);

  return { current, longest };
}
