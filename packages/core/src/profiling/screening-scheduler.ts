// packages/core/src/profiling/screening-scheduler.ts
//
// Determines when a user should be prompted for clinical screening based on
// their completion history and the defined periodicity windows.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScreeningSchedule {
  phq2Due: boolean;
  gad2Due: boolean;
  phq9Due: boolean;
  gad7Due: boolean;
  who5Due: boolean;
  nextDue: { instrument: string; dueDate: Date } | null;
}

export interface ScreeningHistory {
  instrument: string;
  completedAt: Date;
  total: number;
  suggestsFullScreening?: boolean;
}

// ---------------------------------------------------------------------------
// Periodicity windows (in days)
// ---------------------------------------------------------------------------

const WINDOWS: Record<string, number> = {
  phq2: 7,   // weekly
  gad2: 7,   // weekly
  phq9: 30,  // monthly
  gad7: 30,  // monthly
  who5: 14,  // every 2 weeks
};

const ALL_INSTRUMENTS = ['phq2', 'gad2', 'phq9', 'gad7', 'who5'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  return Math.abs(b.getTime() - a.getTime()) / msPerDay;
}

/** Find the most recent entry for a given instrument. */
function mostRecent(
  history: ScreeningHistory[],
  instrument: string,
): ScreeningHistory | undefined {
  return history
    .filter((h) => h.instrument === instrument)
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];
}

// ---------------------------------------------------------------------------
// Core scheduling logic
// ---------------------------------------------------------------------------

export function getScreeningSchedule(
  history: ScreeningHistory[],
  now: Date = new Date(),
): ScreeningSchedule {
  // Step 1: Determine basic due status per instrument based on periodicity
  const isDue: Record<string, boolean> = {};
  // Track how many days until due for instruments that are NOT yet due
  const daysUntilDue: Record<string, number> = {};

  for (const instrument of ALL_INSTRUMENTS) {
    const last = mostRecent(history, instrument);
    if (!last) {
      // Never completed — due immediately
      isDue[instrument] = true;
    } else {
      const elapsed = daysBetween(last.completedAt, now);
      const window = WINDOWS[instrument];
      isDue[instrument] = elapsed >= window;
      if (!isDue[instrument]) {
        daysUntilDue[instrument] = window - elapsed;
      }
    }
  }

  // Step 2: Short-form escalation — if PHQ-2 suggests full screening and
  // PHQ-9 is not already within its window, mark PHQ-9 as due.
  const lastPhq2 = mostRecent(history, 'phq2');
  if (lastPhq2?.suggestsFullScreening && !isDue['phq9']) {
    // Only escalate if PHQ-9 is not already recently completed
    const lastPhq9 = mostRecent(history, 'phq9');
    if (!lastPhq9 || daysBetween(lastPhq9.completedAt, now) >= WINDOWS['phq9']) {
      isDue['phq9'] = true;
      delete daysUntilDue['phq9'];
    }
  }

  // Same logic for GAD-2 → GAD-7
  const lastGad2 = mostRecent(history, 'gad2');
  if (lastGad2?.suggestsFullScreening && !isDue['gad7']) {
    const lastGad7 = mostRecent(history, 'gad7');
    if (!lastGad7 || daysBetween(lastGad7.completedAt, now) >= WINDOWS['gad7']) {
      isDue['gad7'] = true;
      delete daysUntilDue['gad7'];
    }
  }

  // Step 3: Determine nextDue — the soonest upcoming (not yet due) screening
  let nextDue: ScreeningSchedule['nextDue'] = null;

  const upcoming = Object.entries(daysUntilDue).filter(
    ([instrument]) => !isDue[instrument],
  );

  if (upcoming.length > 0) {
    upcoming.sort((a, b) => a[1] - b[1]);
    const [instrument, days] = upcoming[0];
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + Math.round(days));
    nextDue = { instrument, dueDate };
  }

  return {
    phq2Due: isDue['phq2'],
    gad2Due: isDue['gad2'],
    phq9Due: isDue['phq9'],
    gad7Due: isDue['gad7'],
    who5Due: isDue['who5'],
    nextDue,
  };
}
