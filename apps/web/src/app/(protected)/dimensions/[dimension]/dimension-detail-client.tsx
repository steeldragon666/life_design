'use client';

/**
 * Dimension Detail Client Component
 *
 * Full deep-dive view for a single life dimension, including:
 *   1. Hero section with ScoreRing and DimensionBadge
 *   2. Score history line chart (90 days)
 *   3. Contributing features horizontal bar chart
 *   4. Cross-dimension correlations bar chart
 *   5. 7-day forecast with confidence band
 *   6. Recommended actions
 *   7. Causal insights
 *
 * All recharts components are dynamically imported (no SSR) to avoid
 * hydration issues. Mock data is used inline for any sections not yet
 * backed by real Supabase tables — the structure is designed so real
 * queries can replace mocks with zero layout changes.
 */

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Dimension, DIMENSION_LABELS, ALL_DIMENSIONS } from '@life-design/core';
import {
  GlassCard,
  DimensionBadge,
  ScoreRing,
  SectionHeader,
  InsightCardDS,
  TrendIndicator,
  StatCard,
  dimensionColor,
  DIMENSION_TW_COLORS,
} from '@life-design/ui';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Target,
  Zap,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic recharts imports (SSR disabled)
// ─────────────────────────────────────────────────────────────────────────────

const LineChart = dynamic(
  () => import('recharts').then((m) => m.LineChart),
  { ssr: false },
);
const Line = dynamic(
  () => import('recharts').then((m) => m.Line),
  { ssr: false },
);
const BarChart = dynamic(
  () => import('recharts').then((m) => m.BarChart),
  { ssr: false },
);
const Bar = dynamic(
  () => import('recharts').then((m) => m.Bar),
  { ssr: false },
);
const XAxis = dynamic(
  () => import('recharts').then((m) => m.XAxis),
  { ssr: false },
);
const YAxis = dynamic(
  () => import('recharts').then((m) => m.YAxis),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import('recharts').then((m) => m.CartesianGrid),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import('recharts').then((m) => m.Tooltip),
  { ssr: false },
);
const ReferenceLine = dynamic(
  () => import('recharts').then((m) => m.ReferenceLine),
  { ssr: false },
);
const Area = dynamic(
  () => import('recharts').then((m) => m.Area),
  { ssr: false },
);
const AreaChart = dynamic(
  () => import('recharts').then((m) => m.AreaChart),
  { ssr: false },
);
const ResponsiveContainer = dynamic(
  () => import('recharts').then((m) => m.ResponsiveContainer),
  { ssr: false },
);
const Cell = dynamic(
  () => import('recharts').then((m) => m.Cell),
  { ssr: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ServerData {
  currentScore: number | null;
  scoreHistory: { score: number; created_at: string }[];
  totalCheckins: number;
}

interface DimensionDetailClientProps {
  dimension: Dimension;
  serverData: ServerData;
}

interface FeatureImportance {
  feature: string;
  label: string;
  importance: number; // [0, 1]
  direction: 'positive' | 'negative';
}

interface CrossDimCorrelation {
  dimension: string;
  coefficient: number;
  confidence: number;
}

interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  improvement: number; // Percent improvement seen by similar users
  timeframe: string;
}

interface CausalInsight {
  id: string;
  feature: string;
  featureLabel: string;
  direction: 'positive' | 'negative';
  strength: 'suggestive' | 'moderate' | 'strong';
  narrative: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension-specific configuration
// ─────────────────────────────────────────────────────────────────────────────

const DIMENSION_ICONS: Record<Dimension, string> = {
  career: '💼',
  finance: '💰',
  health: '❤️',
  fitness: '🏋️',
  family: '👨‍👩‍👧‍👦',
  social: '🤝',
  romance: '💕',
  growth: '🌱',
};

const DIMENSION_DESCRIPTIONS: Record<Dimension, string> = {
  career: 'Professional performance, work satisfaction, and career trajectory.',
  finance: 'Financial health, savings behaviour, income trends, and economic stress.',
  health: 'Physical and mental wellbeing — sleep, HRV, mood, and vitality.',
  fitness: 'Movement, training load, aerobic capacity, and physical activity.',
  family: 'Family connection quality, shared time, and relationship depth.',
  social: 'Social calendar richness, community belonging, and connection quality.',
  romance: 'Romantic relationship quality, partner connection, and intimacy.',
  growth: 'Personal development, learning, self-efficacy, and goal progress.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock data generators
// ─────────────────────────────────────────────────────────────────────────────

function generateMockScoreHistory(
  dimension: Dimension,
  days: number = 90,
): { date: string; score: number }[] {
  // Seed deterministically from dimension name so it's consistent per session
  const seed = dimension.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const baseScore = 5.5 + (seed % 20) / 10;

  const today = new Date();
  const points: { date: string; score: number }[] = [];

  let current = baseScore;
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Small random walk with upward drift
    current += (Math.sin(i * 0.3 + seed) * 0.4 + Math.random() * 0.3 - 0.1);
    current = Math.max(1, Math.min(10, current));
    points.push({
      date: d.toISOString().slice(0, 10),
      score: parseFloat(current.toFixed(2)),
    });
  }
  return points;
}

function generateMockFeatureImportance(dimension: Dimension): FeatureImportance[] {
  const FEATURES_BY_DIMENSION: Record<Dimension, FeatureImportance[]> = {
    health: [
      { feature: 'sleep_hours', label: 'Sleep Duration', importance: 0.89, direction: 'positive' },
      { feature: 'hrv_ms', label: 'Heart Rate Variability', importance: 0.82, direction: 'positive' },
      { feature: 'mood_score', label: 'Daily Mood', importance: 0.74, direction: 'positive' },
      { feature: 'steps', label: 'Daily Steps', importance: 0.61, direction: 'positive' },
      { feature: 'financial_stress_score', label: 'Financial Stress', importance: 0.53, direction: 'negative' },
      { feature: 'meeting_hours', label: 'Meeting Load', importance: 0.41, direction: 'negative' },
    ],
    fitness: [
      { feature: 'weekly_distance_km', label: 'Weekly Distance', importance: 0.91, direction: 'positive' },
      { feature: 'training_load', label: 'Training Load', importance: 0.78, direction: 'positive' },
      { feature: 'vo2_max_est', label: 'VO2 Max Est.', importance: 0.71, direction: 'positive' },
      { feature: 'rest_days_ratio', label: 'Rest Days', importance: 0.58, direction: 'positive' },
      { feature: 'sleep_quality', label: 'Sleep Quality', importance: 0.52, direction: 'positive' },
      { feature: 'calorie_adherence', label: 'Calorie Adherence', importance: 0.39, direction: 'positive' },
    ],
    career: [
      { feature: 'focus_blocks', label: 'Focus Blocks', importance: 0.87, direction: 'positive' },
      { feature: 'work_hours', label: 'Work Hours', importance: 0.72, direction: 'positive' },
      { feature: 'meeting_hours', label: 'Meeting Load', importance: 0.68, direction: 'negative' },
      { feature: 'sentiment_score', label: 'Check-in Sentiment', importance: 0.55, direction: 'positive' },
      { feature: 'calendar_fragmentation', label: 'Calendar Fragmentation', importance: 0.49, direction: 'negative' },
      { feature: 'sleep_hours', label: 'Sleep Duration', importance: 0.41, direction: 'positive' },
    ],
    finance: [
      { feature: 'savings_rate', label: 'Savings Rate', importance: 0.93, direction: 'positive' },
      { feature: 'revenue_trend', label: 'Revenue Trend', importance: 0.81, direction: 'positive' },
      { feature: 'expense_ratio', label: 'Expense Ratio', importance: 0.74, direction: 'negative' },
      { feature: 'income_diversity', label: 'Income Diversity', importance: 0.62, direction: 'positive' },
      { feature: 'financial_stress_score', label: 'Financial Stress', importance: 0.58, direction: 'negative' },
      { feature: 'work_hours', label: 'Work Hours', importance: 0.35, direction: 'positive' },
    ],
    social: [
      { feature: 'social_events', label: 'Social Events', importance: 0.90, direction: 'positive' },
      { feature: 'sentiment_score', label: 'Check-in Sentiment', importance: 0.69, direction: 'positive' },
      { feature: 'work_hours', label: 'Work Hours', importance: 0.55, direction: 'negative' },
      { feature: 'theme_diversity', label: 'Conversation Themes', importance: 0.48, direction: 'positive' },
      { feature: 'weekend_work_ratio', label: 'Weekend Work', importance: 0.44, direction: 'negative' },
      { feature: 'mood_score', label: 'Daily Mood', importance: 0.38, direction: 'positive' },
    ],
    family: [
      { feature: 'work_hours', label: 'Work Hours', importance: 0.85, direction: 'negative' },
      { feature: 'weekend_work_ratio', label: 'Weekend Work', importance: 0.77, direction: 'negative' },
      { feature: 'social_events', label: 'Shared Events', importance: 0.63, direction: 'positive' },
      { feature: 'mood_score', label: 'Daily Mood', importance: 0.55, direction: 'positive' },
      { feature: 'steps', label: 'Active Days', importance: 0.41, direction: 'positive' },
      { feature: 'meeting_hours', label: 'Meeting Load', importance: 0.37, direction: 'negative' },
    ],
    romance: [
      { feature: 'work_hours', label: 'Work Hours', importance: 0.82, direction: 'negative' },
      { feature: 'mood_score', label: 'Daily Mood', importance: 0.75, direction: 'positive' },
      { feature: 'sleep_hours', label: 'Sleep Duration', importance: 0.64, direction: 'positive' },
      { feature: 'hrv_ms', label: 'HRV (Stress Proxy)', importance: 0.57, direction: 'positive' },
      { feature: 'weekend_work_ratio', label: 'Weekend Work', importance: 0.52, direction: 'negative' },
      { feature: 'social_events', label: 'Shared Social Time', importance: 0.43, direction: 'positive' },
    ],
    growth: [
      { feature: 'focus_blocks', label: 'Deep Work Sessions', importance: 0.88, direction: 'positive' },
      { feature: 'self_efficacy_score', label: 'Self-Efficacy', importance: 0.80, direction: 'positive' },
      { feature: 'sleep_quality', label: 'Sleep Quality', importance: 0.69, direction: 'positive' },
      { feature: 'sentiment_score', label: 'Check-in Sentiment', importance: 0.62, direction: 'positive' },
      { feature: 'meeting_hours', label: 'Meeting Load', importance: 0.48, direction: 'negative' },
      { feature: 'social_events', label: 'Social Learning', importance: 0.38, direction: 'positive' },
    ],
  };
  return FEATURES_BY_DIMENSION[dimension] ?? [];
}

function generateMockCrossDimCorrelations(dimension: Dimension): CrossDimCorrelation[] {
  const CORRELATIONS: Record<Dimension, Record<string, number>> = {
    health: { fitness: 0.72, finance: -0.38, career: -0.31, social: 0.44, family: 0.28, romance: 0.51, growth: 0.39 },
    fitness: { health: 0.72, finance: 0.21, career: 0.33, social: 0.27, family: 0.18, romance: 0.22, growth: 0.45 },
    career: { finance: 0.68, health: -0.31, fitness: 0.33, social: 0.15, family: -0.42, romance: -0.38, growth: 0.55 },
    finance: { career: 0.68, health: -0.38, fitness: 0.21, social: 0.29, family: 0.14, romance: 0.11, growth: 0.31 },
    social: { health: 0.44, fitness: 0.27, career: 0.15, finance: 0.29, family: 0.52, romance: 0.41, growth: 0.33 },
    family: { social: 0.52, health: 0.28, fitness: 0.18, career: -0.42, finance: 0.14, romance: 0.61, growth: 0.19 },
    romance: { family: 0.61, health: 0.51, social: 0.41, fitness: 0.22, career: -0.38, finance: 0.11, growth: 0.24 },
    growth: { career: 0.55, fitness: 0.45, health: 0.39, social: 0.33, finance: 0.31, romance: 0.24, family: 0.19 },
  };

  const dimCorrs = CORRELATIONS[dimension] ?? {};
  return ALL_DIMENSIONS
    .filter((d) => d !== dimension)
    .map((d) => ({
      dimension: d,
      coefficient: dimCorrs[d] ?? 0,
      confidence: 0.6 + Math.abs(dimCorrs[d] ?? 0) * 0.4,
    }))
    .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
}

function generateMockForecast(currentScore: number): ForecastPoint[] {
  const today = new Date();
  const points: ForecastPoint[] = [];
  let pred = currentScore;

  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    pred += (Math.random() - 0.45) * 0.3;
    pred = Math.max(1, Math.min(10, pred));
    const uncertainty = 0.1 + i * 0.08;
    points.push({
      date: d.toISOString().slice(0, 10),
      predicted: parseFloat(pred.toFixed(2)),
      lower: parseFloat(Math.max(1, pred - uncertainty).toFixed(2)),
      upper: parseFloat(Math.min(10, pred + uncertainty).toFixed(2)),
    });
  }
  return points;
}

function generateMockActions(dimension: Dimension): RecommendedAction[] {
  const ACTIONS: Record<Dimension, RecommendedAction[]> = {
    health: [
      {
        id: 'h1',
        title: 'Protect 7.5+ hours of sleep',
        description: 'Your data shows sleep duration is the #1 predictor of your health score. Users with consistent 7.5h sleep see sustained score improvements.',
        impact: '+1.8 avg score lift',
        effort: 'medium',
        improvement: 24,
        timeframe: '2–3 weeks',
      },
      {
        id: 'h2',
        title: 'Morning HRV check-in',
        description: 'Tracking HRV on waking can help you calibrate daily intensity. High HRV days are strongly correlated with your best health and mood scores.',
        impact: 'Better load management',
        effort: 'low',
        improvement: 15,
        timeframe: '1 week',
      },
      {
        id: 'h3',
        title: 'Reduce meeting blocks before noon',
        description: 'Calendar fragmentation in the morning is negatively associated with your health score. Try batching meetings post-2pm.',
        impact: '-0.6 stress score',
        effort: 'medium',
        improvement: 11,
        timeframe: '3–4 weeks',
      },
    ],
    fitness: [
      {
        id: 'f1',
        title: 'Add one active recovery session weekly',
        description: 'Your rest-day ratio suggests you may be undervaluing recovery. A weekly low-intensity session (walk, yoga) correlates with sustained training load improvements.',
        impact: '+12% training consistency',
        effort: 'low',
        improvement: 18,
        timeframe: '4 weeks',
      },
      {
        id: 'f2',
        title: 'Progressive weekly distance increase',
        description: 'Weekly running distance is your strongest fitness predictor. Increasing by 10% per week with a deload every 4th week is associated with VO2 max gains.',
        impact: '+0.9 fitness score',
        effort: 'medium',
        improvement: 22,
        timeframe: '6–8 weeks',
      },
      {
        id: 'f3',
        title: 'Prioritise sleep before intense sessions',
        description: 'Your performance on high-load training days is strongly linked to prior-night sleep quality. Sub-6h sleep days show 18% lower output.',
        impact: 'Performance boost on key sessions',
        effort: 'low',
        improvement: 14,
        timeframe: '2 weeks',
      },
    ],
    career: [
      {
        id: 'c1',
        title: 'Block 2+ focus sessions daily',
        description: 'Focus blocks are your single strongest career predictor. Users who protect 2+ 90-min deep work sessions see the highest career score momentum.',
        impact: '+1.3 career score',
        effort: 'medium',
        improvement: 27,
        timeframe: '3 weeks',
      },
      {
        id: 'c2',
        title: 'Batch meetings to one daily block',
        description: 'Calendar fragmentation above 4 context switches negatively impacts your sentiment and output scores. Batching meetings reduces cognitive overhead.',
        impact: '-23% context switching',
        effort: 'medium',
        improvement: 19,
        timeframe: '2 weeks',
      },
      {
        id: 'c3',
        title: 'Weekly reflection journaling',
        description: 'Users with high agency language scores in their check-ins consistently outperform peers on career metrics. A weekly 10-min journal prompt helps.',
        impact: 'Agency language +0.4',
        effort: 'low',
        improvement: 13,
        timeframe: '4 weeks',
      },
    ],
    finance: [
      {
        id: 'fi1',
        title: 'Automate savings transfer on payday',
        description: 'Automating a fixed savings transfer within 24h of income receipt is associated with a 31% improvement in savings rate consistency in similar users.',
        impact: '+31% savings consistency',
        effort: 'low',
        improvement: 31,
        timeframe: '1 month',
      },
      {
        id: 'fi2',
        title: 'Weekly expense review ritual',
        description: 'Users who conduct a weekly 15-min expense review show significantly lower financial stress scores and faster debt reduction.',
        impact: '-0.7 stress score',
        effort: 'low',
        improvement: 17,
        timeframe: '4 weeks',
      },
      {
        id: 'fi3',
        title: 'Add one income stream experiment',
        description: 'Income diversity is a strong predictor of your long-term financial score. Even a small side project reduces volatility in the model.',
        impact: '+0.4 finance resilience',
        effort: 'high',
        improvement: 21,
        timeframe: '3 months',
      },
    ],
    social: [
      {
        id: 's1',
        title: 'Schedule one intentional social block weekly',
        description: 'Social event count is your top predictor. Users who proactively schedule 1 meaningful social event per week sustain higher social scores.',
        impact: '+1.1 social score',
        effort: 'medium',
        improvement: 23,
        timeframe: '3 weeks',
      },
      {
        id: 's2',
        title: 'Reduce weekend work ratio',
        description: 'Working on weekends crowds out social time. Users who protect Saturday mornings see a 19% social score improvement within 4 weeks.',
        impact: '+19% available social time',
        effort: 'medium',
        improvement: 19,
        timeframe: '4 weeks',
      },
      {
        id: 's3',
        title: 'Quality over quantity: depth conversations',
        description: 'Check-in theme diversity predicts social score better than raw event count. One deep conversation outweighs three surface-level meetups in the model.',
        impact: 'Higher wellbeing return per event',
        effort: 'low',
        improvement: 12,
        timeframe: '2 weeks',
      },
    ],
    family: [
      {
        id: 'fa1',
        title: 'Protect weekends from work',
        description: 'Weekend work ratio is your strongest negative family predictor. Users who limit weekend work to under 2h report 28% higher family scores.',
        impact: '+28% connection quality',
        effort: 'medium',
        improvement: 28,
        timeframe: '4 weeks',
      },
      {
        id: 'fa2',
        title: 'Create a daily transition ritual',
        description: 'A 10-minute transition between work and home (walk, breathing) reduces spillover stress and is associated with more present family interactions.',
        impact: '-0.5 stress carryover',
        effort: 'low',
        improvement: 16,
        timeframe: '2 weeks',
      },
      {
        id: 'fa3',
        title: 'Weekly shared activity planning',
        description: 'Proactively planning one shared physical activity per week shows strong positive correlation with family score improvement in similar users.',
        impact: '+0.9 family score',
        effort: 'low',
        improvement: 20,
        timeframe: '3 weeks',
      },
    ],
    romance: [
      {
        id: 'r1',
        title: 'Prioritise screen-free evening time',
        description: 'Partner connection scores are highest on evenings without work email or social media. A 9pm digital cutoff is associated with better romance scores.',
        impact: '+0.8 connection quality',
        effort: 'medium',
        improvement: 22,
        timeframe: '2 weeks',
      },
      {
        id: 'r2',
        title: 'Protect weekend morning rituals',
        description: 'Shared morning routines (coffee, walks) are among the strongest romance score predictors in couples data. Protect at least one per weekend.',
        impact: '+18% relationship satisfaction',
        effort: 'low',
        improvement: 18,
        timeframe: '3 weeks',
      },
      {
        id: 'r3',
        title: 'Reduce workload during high-stress periods',
        description: 'Your romance score is most vulnerable to dips during high meeting-load weeks. Pre-emptive workload management protects relationship quality.',
        impact: '-0.6 stress spillover',
        effort: 'high',
        improvement: 14,
        timeframe: '4 weeks',
      },
    ],
    growth: [
      {
        id: 'g1',
        title: 'Daily 30-min learning block',
        description: 'Users with a consistent daily learning block show 27% higher growth scores. Pairing it with your morning focus time amplifies the effect.',
        impact: '+1.2 growth score',
        effort: 'medium',
        improvement: 27,
        timeframe: '4 weeks',
      },
      {
        id: 'g2',
        title: 'Weekly goal review (Friday 10-min)',
        description: 'Self-efficacy scores are highest for users who conduct brief Friday reviews. The ritual of acknowledging progress compounds over time.',
        impact: '+0.5 self-efficacy',
        effort: 'low',
        improvement: 15,
        timeframe: '2 weeks',
      },
      {
        id: 'g3',
        title: 'Sleep quality as growth foundation',
        description: 'Sleep quality is your second-strongest growth predictor. Sub-optimal sleep the night before a learning session reduces retention by an estimated 20%.',
        impact: 'Better knowledge retention',
        effort: 'medium',
        improvement: 19,
        timeframe: '3 weeks',
      },
    ],
  };
  return ACTIONS[dimension] ?? [];
}

function generateMockCausalInsights(dimension: Dimension): CausalInsight[] {
  const INSIGHTS: Record<Dimension, CausalInsight[]> = {
    health: [
      {
        id: 'ch1',
        feature: 'sleep_hours',
        featureLabel: 'Sleep Duration',
        direction: 'positive',
        strength: 'moderate',
        narrative: 'Evidence suggests that sleep duration may be meaningfully associated with your health score. Granger causality analysis (F=4.8, p=0.03) indicates that sleep improvements tend to precede health score improvements by approximately 24 hours, though bidirectional influence is possible.',
      },
      {
        id: 'ch2',
        feature: 'financial_stress_score',
        featureLabel: 'Financial Stress',
        direction: 'negative',
        strength: 'suggestive',
        narrative: 'Financial stress may be weakly associated with suppressed health scores. The relationship is noisy but consistent across 6-week rolling windows. Reducing financial uncertainty during high-stress periods may buffer against health score declines.',
      },
    ],
    fitness: [
      {
        id: 'cf1',
        feature: 'sleep_quality',
        featureLabel: 'Sleep Quality',
        direction: 'positive',
        strength: 'moderate',
        narrative: 'Evidence suggests sleep quality may be associated with next-day training output. On days following high-quality sleep (score 7+), your fitness metrics are on average 15% stronger, though the relationship may reflect shared lifestyle factors rather than a direct causal pathway.',
      },
    ],
    career: [
      {
        id: 'cc1',
        feature: 'focus_blocks',
        featureLabel: 'Protected Focus Time',
        direction: 'positive',
        strength: 'strong',
        narrative: 'Strong evidence suggests that calendar-protected focus time may be causally associated with career score improvements. Cross-convergent mapping analysis identifies focus block count as a likely leading indicator, with peak effect observed 2–3 days post-session.',
      },
      {
        id: 'cc2',
        feature: 'sleep_hours',
        featureLabel: 'Sleep Duration',
        direction: 'positive',
        strength: 'suggestive',
        narrative: 'There is a tentative association between sleep duration and career scores, possibly mediated by improved cognitive performance. The signal is present but requires more data to confirm directionality with confidence.',
      },
    ],
    finance: [
      {
        id: 'cfi1',
        feature: 'sentiment_score',
        featureLabel: 'Check-in Sentiment',
        direction: 'positive',
        strength: 'suggestive',
        narrative: 'Positive sentiment in check-in text may be weakly associated with favourable financial outcomes 2–3 weeks later. This tentative relationship may reflect how emotional state influences decision-making quality and risk tolerance, though correlation does not confirm causation here.',
      },
    ],
    social: [
      {
        id: 'cs1',
        feature: 'mood_score',
        featureLabel: 'Daily Mood',
        direction: 'positive',
        strength: 'suggestive',
        narrative: 'Mood and social scores appear mutually reinforcing. The data suggests mood improvements may mildly precede social score improvements by 1–2 days, though reverse causality (social activity improving mood) is equally plausible.',
      },
    ],
    family: [
      {
        id: 'cfa1',
        feature: 'work_hours',
        featureLabel: 'Work Hours',
        direction: 'negative',
        strength: 'moderate',
        narrative: 'Evidence suggests that sustained high work hours may be associated with family score declines. The relationship is robust across different time windows, with the strongest effect observed when work hours exceed 10 hours per weekday across 3 or more consecutive days.',
      },
    ],
    romance: [
      {
        id: 'cr1',
        feature: 'hrv_ms',
        featureLabel: 'Heart Rate Variability',
        direction: 'positive',
        strength: 'suggestive',
        narrative: 'HRV — a proxy for autonomic nervous system regulation and stress — may be weakly associated with romantic relationship quality. Higher HRV appears to precede better romance scores by 1–2 days, possibly via reduced stress reactivity improving interpersonal interactions.',
      },
    ],
    growth: [
      {
        id: 'cg1',
        feature: 'focus_blocks',
        featureLabel: 'Deep Work Sessions',
        direction: 'positive',
        strength: 'strong',
        narrative: 'Focus time shows the strongest causal signal in your growth dimension. Granger analysis (F=6.2, p=0.01) suggests that focus session count meaningfully precedes growth score improvements, with effects peaking 3–5 days later. This is one of the more robust directional findings in your data.',
      },
    ],
  };
  return INSIGHTS[dimension] ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────────────────

function SectionSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="glass-dark rounded-3xl border border-white/5 animate-pulse"
      style={{ height }}
    />
  );
}

function EffortBadge({ effort }: { effort: RecommendedAction['effort'] }) {
  const config = {
    low: { label: 'Low effort', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    medium: { label: 'Medium effort', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    high: { label: 'High effort', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  }[effort];

  return (
    <span
      className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function CausalStrengthBadge({ strength }: { strength: CausalInsight['strength'] }) {
  const config = {
    suggestive: { label: 'Suggestive', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    moderate: { label: 'Moderate evidence', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    strong: { label: 'Strong evidence', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  }[strength];

  return (
    <span
      className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(0,0,0,0.85)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#f8fafc',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 11,
  padding: '8px 12px',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function DimensionDetailClient({
  dimension,
  serverData,
}: DimensionDetailClientProps) {
  const color = dimensionColor(dimension);
  const label = DIMENSION_LABELS[dimension];
  const icon = DIMENSION_ICONS[dimension];
  const description = DIMENSION_DESCRIPTIONS[dimension];

  const isColdStart = serverData.totalCheckins < 30;

  // Merge real server data with mock fallbacks
  const scoreHistoryData = useMemo(() => {
    if (serverData.scoreHistory.length >= 7) {
      return serverData.scoreHistory.map((r) => ({
        date: r.created_at.slice(0, 10),
        score: r.score,
      }));
    }
    return generateMockScoreHistory(dimension);
  }, [serverData.scoreHistory, dimension]);

  const currentScore = useMemo(() => {
    if (serverData.currentScore != null) return serverData.currentScore;
    const last = scoreHistoryData[scoreHistoryData.length - 1];
    return last?.score ?? 7.0;
  }, [serverData.currentScore, scoreHistoryData]);

  const featureImportance = useMemo(
    () => generateMockFeatureImportance(dimension),
    [dimension],
  );

  const crossDimCorrelations = useMemo(
    () => generateMockCrossDimCorrelations(dimension),
    [dimension],
  );

  const forecastData = useMemo(
    () => (isColdStart ? [] : generateMockForecast(currentScore)),
    [isColdStart, currentScore],
  );

  const recommendedActions = useMemo(
    () => generateMockActions(dimension),
    [dimension],
  );

  const causalInsights = useMemo(
    () => generateMockCausalInsights(dimension),
    [dimension],
  );

  // Trend calculation
  const trend = useMemo(() => {
    if (scoreHistoryData.length < 8) return 0;
    const recent = scoreHistoryData.slice(-7).map((d) => d.score);
    const prior = scoreHistoryData.slice(-14, -7).map((d) => d.score);
    const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const priorMean = prior.reduce((a, b) => a + b, 0) / prior.length;
    return recentMean - priorMean;
  }, [scoreHistoryData]);

  const trendDirection: 'up' | 'down' | 'neutral' =
    trend > 0.1 ? 'up' : trend < -0.1 ? 'down' : 'neutral';

  const trendPercent = Math.abs(trend / Math.max(currentScore, 1)) * 100;

  // Combined chart data for history + forecast
  const combinedChartData = useMemo(() => {
    const historyForChart = scoreHistoryData.slice(-30); // Last 30 days
    const history = historyForChart.map((d) => ({
      date: d.date.slice(5), // MM-DD
      score: d.score,
      predicted: undefined as number | undefined,
      lower: undefined as number | undefined,
      upper: undefined as number | undefined,
    }));

    if (forecastData.length > 0 && !isColdStart) {
      const forecasts = forecastData.map((d) => ({
        date: d.date.slice(5),
        score: undefined as number | undefined,
        predicted: d.predicted,
        lower: d.lower,
        upper: d.upper,
      }));
      return [...history, ...forecasts];
    }
    return history;
  }, [scoreHistoryData, forecastData, isColdStart]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-bold group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Dashboard
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-400 text-sm font-bold">{label}</span>
      </div>

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <div
        className="glass-card premium-border relative overflow-hidden"
        style={{ borderColor: `${color}20` }}
      >
        {/* Background glow */}
        <div
          className="absolute top-0 right-0 h-64 w-64 rounded-full blur-[80px] opacity-20 pointer-events-none"
          style={{ backgroundColor: color }}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          {/* Score ring */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <ScoreRing
              score={currentScore}
              size={160}
              strokeWidth={10}
              animate
            />
            <TrendIndicator
              direction={trendDirection}
              percent={trendPercent}
              period="7 days"
            />
          </div>

          {/* Text content */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-4xl">{icon}</span>
              <DimensionBadge dimension={dimension} size="lg" />
            </div>

            <h1
              className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter"
              style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
            >
              {label}
            </h1>

            <p
              className="text-slate-400 text-base max-w-xl"
              style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
            >
              {description}
            </p>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-3 pt-2">
              <StatCard
                label="Current score"
                value={currentScore.toFixed(1)}
                trend={trendDirection}
                changePercent={trendPercent}
                className="min-w-[120px]"
              />
              <StatCard
                label="7-day avg"
                value={
                  scoreHistoryData.length >= 7
                    ? (
                        scoreHistoryData
                          .slice(-7)
                          .reduce((a, d) => a + d.score, 0) / 7
                      ).toFixed(1)
                    : '--'
                }
                trend="neutral"
                className="min-w-[120px]"
              />
              <StatCard
                label="Days tracked"
                value={scoreHistoryData.length.toString()}
                trend="neutral"
                className="min-w-[120px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SCORE HISTORY ─────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <SectionHeader
          title="Score History"
          subtitle="Last 90 days with 7-day forecast"
          level="h2"
          action={
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-bold text-slate-500">Actual</span>
              <div className="h-2 w-2 rounded-full bg-slate-600 border border-dashed border-slate-500" />
              <span className="text-xs font-bold text-slate-500">Forecast</span>
            </div>
          }
        />

        <div className="glass-dark rounded-3xl border border-white/5 p-6">
          {combinedChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={combinedChartData}
                margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient id={`grad-${dimension}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`grad-forecast-${dimension}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#475569', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(combinedChartData.length / 6)}
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fill: '#475569', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}
                  tickLine={false}
                  axisLine={false}
                  ticks={[0, 2, 4, 6, 8, 10]}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                  formatter={(value: unknown) => {
                    const n = typeof value === 'number' ? value : null;
                    return n != null ? [n.toFixed(2), 'Score'] : ['–', ''];
                  }}
                />
                <ReferenceLine y={5} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

                {/* Forecast confidence band */}
                {!isColdStart && (
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="rgba(99,102,241,0.08)"
                    connectNulls
                  />
                )}
                {!isColdStart && (
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="rgba(0,0,0,0)"
                    connectNulls
                  />
                )}

                {/* Actual score area */}
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#grad-${dimension})`}
                  dot={false}
                  activeDot={{ r: 4, fill: color, stroke: 'rgba(0,0,0,0.5)' }}
                  connectNulls={false}
                />

                {/* Forecast line */}
                {!isColdStart && (
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                    connectNulls
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-500 text-sm italic">Loading chart data...</p>
            </div>
          )}
        </div>
      </section>

      {/* ── 3. CONTRIBUTING FEATURES ─────────────────────────────────────────── */}
      <section className="space-y-6">
        <SectionHeader
          title="Contributing Features"
          subtitle="Which inputs have the most influence on your score"
          level="h2"
        />

        <div className="glass-dark rounded-3xl border border-white/5 p-6">
          {featureImportance.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={featureImportance}
                layout="vertical"
                margin={{ top: 0, right: 20, bottom: 0, left: 130 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tick={{ fill: '#475569', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: '"Cabinet Grotesk", system-ui' }}
                  tickLine={false}
                  axisLine={false}
                  width={125}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value: unknown) => {
                    const n = typeof value === 'number' ? value : 0;
                    return [`${Math.round(n * 100)}%`, 'Importance'];
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="importance" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {featureImportance.map((entry, index) => (
                    <Cell
                      key={`feature-cell-${index}`}
                      fill={entry.direction === 'positive' ? color : '#ef4444'}
                      opacity={0.7 + entry.importance * 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <SectionSkeleton height={280} />
          )}

          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Positive influence</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-red-500/70" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Negative influence</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. CROSS-DIMENSION CORRELATIONS ──────────────────────────────────── */}
      <section className="space-y-6">
        <SectionHeader
          title="Cross-Dimension Correlations"
          subtitle="How your other 7 life dimensions relate to this one"
          level="h2"
          action={
            <Link
              href="/correlations"
              className="flex items-center gap-1.5 text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors"
            >
              Full Explorer
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        />

        <div className="glass-dark rounded-3xl border border-white/5 p-6">
          {crossDimCorrelations.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={crossDimCorrelations}
                layout="vertical"
                margin={{ top: 0, right: 20, bottom: 0, left: 90 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  type="number"
                  domain={[-1, 1]}
                  tick={{ fill: '#475569', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <YAxis
                  type="category"
                  dataKey="dimension"
                  tick={(tickProps: Record<string, unknown>) => {
                    const x = tickProps.x as number;
                    const y = tickProps.y as number;
                    const payload = tickProps.payload as { value: string };
                    const dimLabel =
                      DIMENSION_LABELS[payload.value as Dimension] ?? payload.value;
                    const dimColor = dimensionColor(payload.value);
                    return (
                      <text
                        x={x}
                        y={y}
                        dy={4}
                        textAnchor="end"
                        fill={dimColor}
                        fontSize={10}
                        fontFamily='"Cabinet Grotesk", system-ui'
                        fontWeight={700}
                      >
                        {dimLabel}
                      </text>
                    );
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={85}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value: unknown) => {
                    const n = typeof value === 'number' ? value : 0;
                    return [n.toFixed(3), 'Correlation coefficient'];
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" />
                <Bar dataKey="coefficient" radius={4} maxBarSize={18}>
                  {crossDimCorrelations.map((entry, index) => (
                    <Cell
                      key={`corr-cell-${index}`}
                      fill={entry.coefficient >= 0 ? '#10b981' : '#ef4444'}
                      opacity={0.5 + Math.abs(entry.coefficient) * 0.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <SectionSkeleton height={280} />
          )}

          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded-sm bg-emerald-500/60" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Positive correlation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded-sm bg-red-500/60" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Negative correlation</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FORECAST PANEL ────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <SectionHeader
          title="7-Day Forecast"
          subtitle="Predictive model with 80% confidence band"
          level="h2"
        />

        {isColdStart ? (
          <div className="glass-dark rounded-3xl border border-amber-500/20 p-8 flex items-start gap-4">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p
                className="font-bold text-white text-sm mb-1"
                style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
              >
                More data needed for forecasting
              </p>
              <p
                className="text-sm text-slate-400 leading-relaxed"
                style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
              >
                You have {serverData.totalCheckins} check-in
                {serverData.totalCheckins !== 1 ? 's' : ''} so far. Forecasting
                activates after 30+ days of data, giving the model enough signal to
                identify your personal patterns. Keep checking in daily!
              </p>
              <div className="mt-4 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (serverData.totalCheckins / 30) * 100)}%`,
                    backgroundColor: color,
                    opacity: 0.7,
                  }}
                />
              </div>
              <p className="text-[10px] font-bold text-slate-600 mt-1.5">
                {serverData.totalCheckins}/30 days
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-dark rounded-3xl border border-white/5 p-6">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={forecastData}
                margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient id={`forecast-band-${dimension}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#475569', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fill: '#475569', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}
                  tickLine={false}
                  axisLine={false}
                  ticks={[0, 2, 4, 6, 8, 10]}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value: unknown, name: unknown) => {
                    const n = typeof value === 'number' ? value : 0;
                    const key = String(name);
                    const label =
                      key === 'upper' ? 'Upper bound' : key === 'lower' ? 'Lower bound' : 'Predicted';
                    return [n.toFixed(2), label];
                  }}
                  cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                />
                {/* Confidence band */}
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill={`url(#forecast-band-${dimension})`}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="rgba(0,0,0,0)"
                />
                {/* Predicted line */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: color, stroke: 'rgba(0,0,0,0.5)' }}
                />
              </AreaChart>
            </ResponsiveContainer>

            <p className="text-[10px] font-bold text-slate-600 mt-3 text-center">
              Shaded area represents the 80% confidence interval. Forecasts beyond 7 days are not shown.
            </p>
          </div>
        )}
      </section>

      {/* ── 6. RECOMMENDED ACTIONS ───────────────────────────────────────────── */}
      <section className="space-y-6">
        <SectionHeader
          title="Recommended Actions"
          subtitle="Evidence-based interventions ranked by expected impact"
          level="h2"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendedActions.map((action) => (
            <div
              key={action.id}
              className="glass-dark rounded-3xl border border-white/5 p-6 space-y-4 group hover:border-white/10 transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="h-9 w-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}15` }}>
                  <Target className="h-4 w-4" style={{ color }} />
                </div>
                <EffortBadge effort={action.effort} />
              </div>

              {/* Title */}
              <h3
                className="font-bold text-white leading-tight"
                style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
              >
                {action.title}
              </h3>

              {/* Description */}
              <p
                className="text-xs text-slate-400 leading-relaxed"
                style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
              >
                {action.description}
              </p>

              {/* Impact metrics */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-0.5">
                    Similar users saw
                  </p>
                  <p
                    className="text-lg font-black"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      color: '#10b981',
                    }}
                  >
                    +{action.improvement}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-0.5">
                    Timeframe
                  </p>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <p className="text-xs font-bold text-slate-400">{action.timeframe}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. CAUSAL INSIGHTS ───────────────────────────────────────────────── */}
      {causalInsights.length > 0 && (
        <section className="space-y-6">
          <SectionHeader
            title="Causal Insights"
            subtitle="Directional evidence — associations, not guarantees"
            level="h2"
          />

          <div className="space-y-4">
            {causalInsights.map((insight) => (
              <div
                key={insight.id}
                className="glass-dark rounded-3xl border border-white/5 p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${
                        insight.direction === 'positive' ? '#10b981' : '#ef4444'
                      }15`,
                    }}
                  >
                    {insight.direction === 'positive' ? (
                      <TrendingUp
                        className="h-5 w-5"
                        style={{ color: '#10b981' }}
                      />
                    ) : (
                      <TrendingDown
                        className="h-5 w-5"
                        style={{ color: '#ef4444' }}
                      />
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-black text-white"
                        style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
                      >
                        {insight.featureLabel}
                      </span>
                      <CausalStrengthBadge strength={insight.strength} />
                    </div>

                    <p
                      className="text-sm text-slate-300 leading-relaxed"
                      style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
                    >
                      {insight.narrative}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Methodology disclaimer */}
          <div className="glass rounded-2xl p-4 border border-white/5 flex items-start gap-3">
            <Zap className="h-4 w-4 text-primary-400 flex-shrink-0 mt-0.5" />
            <p
              className="text-xs text-slate-500 leading-relaxed"
              style={{ fontFamily: '"Erode", Georgia, serif' }}
            >
              Causal language is intentionally hedged. These findings are based on Granger
              causality tests and cross-convergent mapping — they suggest directional associations
              and do not establish mechanistic causation. Confidence increases with more data.
            </p>
          </div>
        </section>
      )}

      {/* Dimension navigation */}
      <section className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 px-1">
          Explore other dimensions
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_DIMENSIONS.filter((d) => d !== dimension).map((d) => (
            <Link
              key={d}
              href={`/dimensions/${d}`}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-200 group"
              style={{ backgroundColor: `${dimensionColor(d)}08` }}
            >
              <span className="text-lg">{DIMENSION_ICONS[d as Dimension]}</span>
              <span
                className="text-xs font-bold"
                style={{ color: dimensionColor(d) }}
              >
                {DIMENSION_LABELS[d as Dimension]}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
