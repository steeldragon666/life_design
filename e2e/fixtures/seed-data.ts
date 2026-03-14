const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_KEY ?? '';

const headers = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
  apikey: SUPABASE_SERVICE_KEY,
  Prefer: 'return=minimal',
};

interface SeedOptions {
  days: number;
  sleepProductivityCorrelation?: boolean;
  exerciseAnomalyDay?: number;
  moodRegimeChangeDay?: number;
}

function seededRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function seedFeatureStore(
  userId: string,
  options: SeedOptions = { days: 30 },
): Promise<void> {
  const rng = seededRng(42);
  const rows: Record<string, unknown>[] = [];
  const now = new Date();

  for (let d = 0; d < options.days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (options.days - d));
    const dateStr = date.toISOString();

    let sleepHours = 6 + rng() * 3;
    const steps = 4000 + Math.round(rng() * 10000);
    let mood = options.sleepProductivityCorrelation
      ? sleepHours * 0.8 + rng() * 2
      : 3 + rng() * 7;

    // Inject anomaly: spike in steps
    const stepsValue =
      options.exerciseAnomalyDay === d ? steps * 3 : steps;

    // Inject regime change in mood
    if (options.moodRegimeChangeDay && d >= options.moodRegimeChangeDay) {
      mood += 2;
    }

    rows.push(
      { user_id: userId, feature: 'sleep_hours', dimension: 'health', value: sleepHours, confidence: 0.9, source: 'apple_health', recorded_at: dateStr },
      { user_id: userId, feature: 'steps', dimension: 'fitness', value: stepsValue, confidence: 0.9, source: 'apple_health', recorded_at: dateStr },
      { user_id: userId, feature: 'mood_score', dimension: 'health', value: mood, confidence: 0.7, source: 'checkin', recorded_at: dateStr },
    );
  }

  // Batch insert in chunks of 500
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/feature_store`, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.warn(`Seed feature_store batch ${i} failed: ${res.status}`);
    }
  }
}

export async function cleanupTestData(userId: string): Promise<void> {
  const tables = ['feature_store', 'checkins', 'daily_insights', 'correlations_cache'];
  for (const table of tables) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?user_id=eq.${userId}`,
      { method: 'DELETE', headers },
    ).catch(() => {});
  }
}
