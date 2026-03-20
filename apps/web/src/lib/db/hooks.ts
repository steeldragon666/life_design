// ---------------------------------------------------------------------------
// Dexie React Hooks
// ---------------------------------------------------------------------------
// Convenience hooks wrapping useLiveQuery for common database queries.
// ---------------------------------------------------------------------------

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { DBActiveChallenge, DBCheckIn, DBBadge } from './schema';

/**
 * Live query for all active challenges (status === 'active').
 */
export function useActiveChallenges(): DBActiveChallenge[] | undefined {
  return useLiveQuery(
    () =>
      db.activeChallenges
        .where('status')
        .equals('active')
        .toArray(),
  );
}

/**
 * Live query for all check-ins, ordered by date descending.
 */
export function useRecentCheckIns(limit = 30): DBCheckIn[] | undefined {
  return useLiveQuery(
    () =>
      db.checkIns
        .orderBy('date')
        .reverse()
        .limit(limit)
        .toArray(),
    [limit],
  );
}

/**
 * Live query for all earned badges.
 */
export function useEarnedBadges(): DBBadge[] | undefined {
  return useLiveQuery(() => db.badges.toArray());
}

/**
 * Live query for a single check-in by date.
 */
export function useCheckInByDate(date: string): DBCheckIn | undefined {
  return useLiveQuery(
    () => db.checkIns.where('date').equals(date).first(),
    [date],
  );
}
