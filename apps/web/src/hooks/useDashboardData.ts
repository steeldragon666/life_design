'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dimension, ALL_DIMENSIONS } from '@life-design/core';
import { createClient } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DimensionScoreEntry {
  dimension: Dimension;
  score: number;
  trend: number; // -1 to 1 (negative = declining, positive = improving)
  trendDirection: 'up' | 'down' | 'neutral';
}

export interface TimeSeriesPoint {
  date: string;
  mood: number;
  energy: number;
}

export interface CorrelationSpotlight {
  feature1: string;
  feature2: string;
  dimension1: string;
  dimension2: string;
  coefficient: number;
  narrative: string;
  confidence: number;
  sampleSize: number;
}

export interface ForecastEntry {
  dimension: string;
  predictedMin: number;
  predictedMax: number;
  alertDip: boolean;
}

export interface ActivityEntry {
  id: string;
  type: 'checkin' | 'achievement' | 'insight';
  description: string;
  timestamp: string;
}

export interface DashboardInsight {
  id: string;
  headline: string;
  body: string;
  confidence: number;
  dimension: string | null;
  expandedContent?: string;
}

export type DataMaturity = 'cold' | 'warming' | 'active' | 'mature';

export interface DashboardData {
  insights: DashboardInsight[];
  dimensionScores: DimensionScoreEntry[];
  moodTrend: TimeSeriesPoint[];
  topCorrelation: CorrelationSpotlight | null;
  forecast: ForecastEntry[];
  todaysCheckin: { mood: number; completedAt: string } | null;
  streak: number;
  loading: boolean;
  error: string | null;
  dataMaturity: DataMaturity;
  checkinCount: number;
  recentActivity: ActivityEntry[];
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Determines data maturity tier based on total check-in count.
 * cold: 0-3, warming: 4-7, active: 8-14, mature: 15+
 */
function getDataMaturity(checkinCount: number): DataMaturity {
  if (checkinCount <= 3) return 'cold';
  if (checkinCount <= 7) return 'warming';
  if (checkinCount <= 14) return 'active';
  return 'mature';
}

/**
 * Computes a simple linear trend coefficient from a numeric series.
 * Returns a value roughly in [-1, 1].
 */
function computeTrendCoefficient(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  if (denominator === 0) return 0;
  // Normalise slope to [-1, 1] range (divide by max possible score range 10)
  return Math.max(-1, Math.min(1, numerator / denominator / 10));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useDashboardData
 *
 * Fetches all dashboard data client-side via Supabase browser client.
 * Implements a 5-minute stale-time cache and parallel data fetching.
 *
 * @returns DashboardData object with loading/error state and a refetch callback.
 */
export default function useDashboardData(): DashboardData {
  const [data, setData] = useState<Omit<DashboardData, 'refetch'>>({
    insights: [],
    dimensionScores: [],
    moodTrend: [],
    topCorrelation: null,
    forecast: [],
    todaysCheckin: null,
    streak: 0,
    loading: true,
    error: null,
    dataMaturity: 'cold',
    checkinCount: 0,
    recentActivity: [],
  });

  const lastFetchRef = useRef<number>(0);
  const supabase = createClient();

  const fetchAll = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < STALE_TIME_MS) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Authenticate
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        // Guest mode — no Supabase data available.
        // Return empty state without an error so the dashboard renders cleanly
        // using server-provided props and local Dexie data instead.
        lastFetchRef.current = Date.now();
        setData((prev) => ({
          ...prev,
          loading: false,
          error: null,
          dataMaturity: 'cold',
          checkinCount: 0,
        }));
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      // Date 14 days ago for trend window
      const since14 = new Date();
      since14.setDate(since14.getDate() - 14);
      const since14Str = since14.toISOString().slice(0, 10);

      // Date 30 days ago for score history
      const since30 = new Date();
      since30.setDate(since30.getDate() - 30);
      const since30Str = since30.toISOString().slice(0, 10);

      // ---------------------------------------------------------------------------
      // Parallel fetches
      // ---------------------------------------------------------------------------
      const [
        checkinCountResult,
        todayCheckinResult,
        recentCheckinsResult,
        historyCheckinsResult,
        insightsResult,
        streakResult,
        correlationsResult,
        forecastResult,
      ] = await Promise.allSettled([
        // 1. Total checkin count for data maturity
        supabase
          .from('checkins')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),

        // 2. Today's checkin
        supabase
          .from('checkins')
          .select('mood, energy, created_at')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle(),

        // 3. Recent 14-day checkins for mood/energy trend + activity feed
        supabase
          .from('checkins')
          .select('date, mood, energy, created_at')
          .eq('user_id', user.id)
          .gte('date', since14Str)
          .order('date', { ascending: true }),

        // 4. 30-day history for dimension scores + trend calculation
        supabase
          .from('checkins')
          .select('date, dimension_scores(dimension, score)')
          .eq('user_id', user.id)
          .gte('date', since30Str)
          .order('date', { ascending: true }),

        // 5. Latest insights
        supabase
          .from('insights')
          .select('id, headline, body, confidence, dimension, expanded_content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),

        // 6. Streak dates (last 90 days)
        supabase
          .from('checkins')
          .select('date')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(90),

        // 7. Top correlation spotlight
        supabase
          .from('correlation_insights')
          .select('feature1, feature2, dimension1, dimension2, coefficient, narrative, confidence, sample_size')
          .eq('user_id', user.id)
          .order('confidence', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // 8. Forecast entries
        supabase
          .from('forecasts')
          .select('dimension, predicted_min, predicted_max, alert_dip')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      // ---------------------------------------------------------------------------
      // Process checkin count
      // ---------------------------------------------------------------------------
      const checkinCount =
        checkinCountResult.status === 'fulfilled'
          ? (checkinCountResult.value.count ?? 0)
          : 0;

      // ---------------------------------------------------------------------------
      // Process today's checkin
      // ---------------------------------------------------------------------------
      let todaysCheckin: DashboardData['todaysCheckin'] = null;
      if (
        todayCheckinResult.status === 'fulfilled' &&
        todayCheckinResult.value.data
      ) {
        const tc = todayCheckinResult.value.data as {
          mood: number;
          energy?: number;
          created_at: string;
        };
        todaysCheckin = {
          mood: tc.mood ?? 0,
          completedAt: tc.created_at,
        };
      }

      // ---------------------------------------------------------------------------
      // Process mood/energy trend (14 days)
      // ---------------------------------------------------------------------------
      const moodTrend: TimeSeriesPoint[] = [];
      if (
        recentCheckinsResult.status === 'fulfilled' &&
        recentCheckinsResult.value.data
      ) {
        for (const row of recentCheckinsResult.value.data as Array<{
          date: string;
          mood: number;
          energy?: number;
          created_at: string;
        }>) {
          moodTrend.push({
            date: row.date,
            mood: row.mood ?? 0,
            energy: row.energy ?? 0,
          });
        }
      }

      // ---------------------------------------------------------------------------
      // Process dimension scores + trends (30-day history)
      // ---------------------------------------------------------------------------
      type HistoryRow = {
        date: string;
        dimension_scores: Array<{ dimension: string; score: number }>;
      };

      const dimensionSeriesMap: Record<string, number[]> = {};
      const latestDimensionScores: Record<string, number> = {};

      if (
        historyCheckinsResult.status === 'fulfilled' &&
        historyCheckinsResult.value.data
      ) {
        for (const row of historyCheckinsResult.value.data as HistoryRow[]) {
          for (const ds of row.dimension_scores ?? []) {
            if (!dimensionSeriesMap[ds.dimension]) {
              dimensionSeriesMap[ds.dimension] = [];
            }
            dimensionSeriesMap[ds.dimension].push(ds.score);
            latestDimensionScores[ds.dimension] = ds.score;
          }
        }
      }

      const dimensionScores: DimensionScoreEntry[] = ALL_DIMENSIONS.map((dim) => {
        const series = dimensionSeriesMap[dim] ?? [];
        const score = latestDimensionScores[dim] ?? 0;
        const trend = computeTrendCoefficient(series);
        const trendDirection: 'up' | 'down' | 'neutral' =
          trend > 0.05 ? 'up' : trend < -0.05 ? 'down' : 'neutral';
        return { dimension: dim, score, trend, trendDirection };
      });

      // ---------------------------------------------------------------------------
      // Process insights
      // ---------------------------------------------------------------------------
      const insights: DashboardInsight[] = [];
      if (
        insightsResult.status === 'fulfilled' &&
        insightsResult.value.data
      ) {
        for (const row of insightsResult.value.data as Array<{
          id: string;
          headline: string;
          body: string;
          confidence: number;
          dimension: string | null;
          expanded_content?: string;
        }>) {
          insights.push({
            id: row.id,
            headline: row.headline,
            body: row.body,
            confidence: row.confidence ?? 0,
            dimension: row.dimension,
            expandedContent: row.expanded_content,
          });
        }
      }

      // ---------------------------------------------------------------------------
      // Process streak
      // ---------------------------------------------------------------------------
      let streak = 0;
      if (
        streakResult.status === 'fulfilled' &&
        streakResult.value.data
      ) {
        const dates = (streakResult.value.data as Array<{ date: string }>)
          .map((r) => r.date)
          .sort()
          .reverse();

        let current = new Date(today);
        for (const d of dates) {
          const dateStr = current.toISOString().slice(0, 10);
          if (d === dateStr) {
            streak++;
            current.setDate(current.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // ---------------------------------------------------------------------------
      // Process correlation spotlight
      // ---------------------------------------------------------------------------
      let topCorrelation: CorrelationSpotlight | null = null;
      if (
        correlationsResult.status === 'fulfilled' &&
        correlationsResult.value.data
      ) {
        const c = correlationsResult.value.data as {
          feature1: string;
          feature2: string;
          dimension1: string;
          dimension2: string;
          coefficient: number;
          narrative: string;
          confidence: number;
          sample_size: number;
        };
        topCorrelation = {
          feature1: c.feature1,
          feature2: c.feature2,
          dimension1: c.dimension1,
          dimension2: c.dimension2,
          coefficient: c.coefficient,
          narrative: c.narrative,
          confidence: c.confidence,
          sampleSize: c.sample_size,
        };
      }

      // ---------------------------------------------------------------------------
      // Process forecast
      // ---------------------------------------------------------------------------
      const forecast: ForecastEntry[] = [];
      if (
        forecastResult.status === 'fulfilled' &&
        forecastResult.value.data
      ) {
        for (const row of forecastResult.value.data as Array<{
          dimension: string;
          predicted_min: number;
          predicted_max: number;
          alert_dip: boolean;
        }>) {
          forecast.push({
            dimension: row.dimension,
            predictedMin: row.predicted_min,
            predictedMax: row.predicted_max,
            alertDip: row.alert_dip ?? false,
          });
        }
      }

      // ---------------------------------------------------------------------------
      // Build recent activity feed from checkins + insights
      // ---------------------------------------------------------------------------
      const recentActivity: ActivityEntry[] = [];

      if (
        recentCheckinsResult.status === 'fulfilled' &&
        recentCheckinsResult.value.data
      ) {
        const checkins = recentCheckinsResult.value.data as Array<{
          date: string;
          mood: number;
          created_at: string;
        }>;
        for (const c of checkins.slice(-5)) {
          recentActivity.push({
            id: `checkin-${c.date}`,
            type: 'checkin',
            description: `Daily check-in completed — mood ${c.mood}/10`,
            timestamp: c.created_at ?? c.date,
          });
        }
      }

      for (const insight of insights.slice(0, 2)) {
        recentActivity.push({
          id: `insight-${insight.id}`,
          type: 'insight',
          description: insight.headline,
          timestamp: new Date().toISOString(),
        });
      }

      // Sort activity newest first
      recentActivity.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      lastFetchRef.current = Date.now();

      setData({
        insights,
        dimensionScores,
        moodTrend,
        topCorrelation,
        forecast,
        todaysCheckin,
        streak,
        loading: false,
        error: null,
        dataMaturity: getDataMaturity(checkinCount),
        checkinCount,
        recentActivity: recentActivity.slice(0, 5),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setData((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [supabase]);

  useEffect(() => {
    fetchAll(true);
  }, [fetchAll]);

  return {
    ...data,
    refetch: () => fetchAll(true),
  };
}
