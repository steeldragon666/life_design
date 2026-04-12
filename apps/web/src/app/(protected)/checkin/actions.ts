'use server';

import { createClient } from '@/lib/supabase/server';
import {
  createCheckIn,
  getCheckInByDate,
} from '@/lib/services/checkin-service';
import type { CreateCheckInInput } from '@/lib/services/checkin-service';

function isValidScore(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

export async function submitCheckIn(input: CreateCheckInInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  if (!isValidScore(input.mood)) {
    return { data: null, error: 'Mood must be an integer between 1 and 5' };
  }

  const invalidScores = input.scores.some((s) => !isValidScore(s.score));
  if (invalidScores) {
    return {
      data: null,
      error: 'All dimension scores must be integers between 1 and 5',
    };
  }

  const { data: existing } = await getCheckInByDate(user.id, input.date);
  if (existing) {
    return { data: null, error: 'Check-in already exists for this date' };
  }

  const result = await createCheckIn(user.id, input);
  return result;
}
