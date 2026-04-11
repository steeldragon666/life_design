import { createClient } from '@/lib/supabase/server';
import { getLatestScores, getScoreHistory } from '@/lib/services/dashboard-service';
import { computeOverallScore, Dimension, ALL_DIMENSIONS } from '@life-design/core';
import OrbClient from './orb-client';
import type { LifeOrbDimension } from '@/components/dashboard/life-orb';

export const metadata = {
  title: 'Life Orb | Opt In',
  description: 'Immersive 3D visualisation of your life dimension balance.',
};

/**
 * Server component — fetches latest scores + 14-day history to compute trends.
 * Renders the OrbClient (full-screen immersive view).
 */
export default async function OrbPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-900">
        <p className="text-stone-400 text-sm">Loading session…</p>
      </div>
    );
  }

  // Fetch latest scores and 14-day history in parallel
  const [latestResult, historyResult] = await Promise.all([
    getLatestScores(user.id),
    getScoreHistory(user.id, 14),
  ]);

  const latestScores = (latestResult.data ?? []) as { dimension: string; score: number }[];
  const history      = (historyResult.data ?? []) as {
    date: string;
    mood?: number;
    dimension_scores: { dimension: string; score: number }[];
  }[];

  // Compute per-dimension trend from history (linear regression slope, normalised to -1..1)
  const trendMap: Record<string, number> = {};
  for (const dim of ALL_DIMENSIONS) {
    const key = dim as string;
    const points = history
      .map((h, i) => {
        const ds = h.dimension_scores?.find((s) => s.dimension === key);
        return ds ? { x: i, y: ds.score } : null;
      })
      .filter((p): p is { x: number; y: number } => p !== null);

    if (points.length >= 2) {
      const n  = points.length;
      const sx = points.reduce((a, p) => a + p.x, 0);
      const sy = points.reduce((a, p) => a + p.y, 0);
      const sxy = points.reduce((a, p) => a + p.x * p.y, 0);
      const sx2 = points.reduce((a, p) => a + p.x * p.x, 0);
      const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx || 1);
      // Normalise: slope of 1 point/period → trend=1; cap at ±1
      trendMap[key] = Math.max(-1, Math.min(1, slope / 2));
    } else {
      trendMap[key] = 0;
    }
  }

  // Latest mood (from most recent check-in with a mood value)
  const latestMood = history
    .slice()
    .reverse()
    .find((h) => typeof h.mood === 'number' && h.mood > 0)?.mood ?? 5;

  // Build unified dimension array
  const dimensions: LifeOrbDimension[] = ALL_DIMENSIONS.map((dim) => {
    const key = dim as string;
    const found = latestScores.find((s) => s.dimension === key);
    return {
      dimension: dim,
      score: found?.score ?? 5,
      trend: trendMap[key] ?? 0,
    };
  });

  const overallScore =
    latestScores.length > 0
      ? computeOverallScore(latestScores as { dimension: Dimension; score: number }[])
      : 0;

  return (
    <OrbClient
      dimensions={dimensions}
      overallScore={overallScore}
      mood={latestMood}
    />
  );
}
