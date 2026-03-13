'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Dimension,
  DIMENSION_LABELS,
  ALL_DIMENSIONS,
  computeOverallScore,
} from '@life-design/core';
import {
  GlassCard,
  DimensionBadge,
  ScoreRing,
  InsightCardDS,
  SectionHeader,
  TrendIndicator,
  StatCard,
  dimensionColor,
  DIMENSION_TW_COLORS,
} from '@life-design/ui';
import LifeOrb from '@/components/dashboard/life-orb';
import {
  Flame,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  BarChart3,
  Activity,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
} from 'lucide-react';
import useDashboardData from '@/hooks/useDashboardData';

// ---------------------------------------------------------------------------
// Dynamic recharts imports (SSR-safe)
// ---------------------------------------------------------------------------
const LineChart = dynamic(() => import('recharts').then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });
const Bar = dynamic(() => import('recharts').then((m) => m.Bar), { ssr: false });
const BarChart = dynamic(() => import('recharts').then((m) => m.BarChart), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });

// ---------------------------------------------------------------------------
// Server-side props interface (passed from page.tsx)
// ---------------------------------------------------------------------------
interface InsightData {
  id: string;
  type: 'trend' | 'correlation' | 'suggestion' | 'goal_progress' | 'goal_risk';
  title: string;
  body: string;
  dimension: string | null;
}

interface GoalsSummary {
  total: number;
  byHorizon: { short: number; medium: number; long: number };
  nearestDeadline: Record<string, unknown> | null;
}

interface DashboardClientProps {
  latestScores: { dimension: string; score: number }[];
  overallScore: number;
  streak: number;
  dimensionTrends: Record<string, { date: string; score: number }[]>;
  recentInsights: InsightData[];
  goalsSummary?: GoalsSummary;
  nudges?: unknown[];
  firstName?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated skeleton pulse block */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-white/5 ${className}`}
      aria-hidden="true"
    />
  );
}

/** Greeting based on time of day */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Format date in human-readable form */
function formatToday(): string {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Format a timestamp to relative time */
function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/** Data maturity progress bar helper */
function maturityCheckins(count: number): { label: string; target: number; color: string } {
  if (count <= 3) return { label: 'cold start', target: 7, color: '#6366f1' };
  if (count <= 7) return { label: 'warming up', target: 14, color: '#f59e0b' };
  if (count <= 14) return { label: 'active', target: 14, color: '#10b981' };
  return { label: 'mature', target: 14, color: '#10b981' };
}

// ---------------------------------------------------------------------------
// Section: Header Bar
// ---------------------------------------------------------------------------
interface HeaderSectionProps {
  firstName?: string;
  streak: number;
  overallScore: number;
  loading: boolean;
}

function HeaderSection({ firstName, streak, overallScore, loading }: HeaderSectionProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
      {/* Left: Greeting + date */}
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Life Design OS — Active
          </span>
        </div>
        <h1
          className="text-4xl lg:text-5xl font-extrabold text-white tracking-tighter leading-none"
          style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
        >
          {getGreeting()}
          {firstName ? (
            <>
              , <span className="text-primary-400">{firstName}</span>
            </>
          ) : null}
        </h1>
        <p
          className="text-slate-400 text-base mt-1"
          style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
        >
          {formatToday()}
        </p>
      </div>

      {/* Right: Score + Streak + Orb widget */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Overall Score */}
        <div className="glass-dark rounded-3xl p-1.5 flex items-center gap-1 border border-white/5">
          <div className="px-5 py-3 flex flex-col items-center">
            <span
              className="text-3xl font-black text-white leading-none"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {loading ? '—' : overallScore.toFixed(1)}
            </span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              Life Score
            </span>
          </div>
          <div className="h-10 w-px bg-white/5" />
          {/* Streak */}
          <div className="px-4 py-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Flame
                className={`h-4 w-4 ${streak > 0 ? 'text-orange-400' : 'text-slate-600'}`}
              />
            </div>
            <div>
              <p
                className="text-xl font-black text-white leading-none"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {streak}
              </p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Day streak
              </p>
            </div>
          </div>
        </div>

        {/* Mini LifeOrb */}
        <div className="hidden xl:block">
          <div className="glass-dark border border-white/5 rounded-3xl overflow-hidden w-20 h-20">
            <LifeOrb
              scores={[]}
              overallScore={overallScore}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Today's Insights
// ---------------------------------------------------------------------------
interface InsightsSectionProps {
  insights: Array<{
    id: string;
    headline: string;
    body: string;
    confidence: number;
    dimension: string | null;
    expandedContent?: string;
  }>;
  loading: boolean;
  dataMaturity: 'cold' | 'warming' | 'active' | 'mature';
  checkinCount: number;
}

function InsightsSection({ insights, loading, dataMaturity, checkinCount }: InsightsSectionProps) {
  const isCold = dataMaturity === 'cold';
  const { label: matLabel, target, color: matColor } = maturityCheckins(checkinCount);
  const progressPct = Math.min(1, checkinCount / target) * 100;

  return (
    <section aria-label="Today's Insights">
      <SectionHeader
        title="Today's Insights"
        subtitle={
          isCold
            ? 'Complete more check-ins to unlock personalised AI insights'
            : 'AI-generated insights from your life data patterns'
        }
        action={
          !isCold && (
            <Link
              href="/insights"
              className="text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )
        }
        className="mb-5"
      />

      {/* Cold start — progress bar + teaser */}
      {isCold && (
        <GlassCard className="p-6 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-5 w-5 text-primary-400 flex-shrink-0" />
            <p className="text-sm font-bold text-white">
              {checkinCount}/7 check-ins to unlock insights
            </p>
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${matColor}20`, color: matColor }}
            >
              {matLabel}
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, backgroundColor: matColor }}
            />
          </div>
          <p
            className="text-xs text-slate-400 mt-3 leading-relaxed"
            style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
          >
            Your AI mentor analyses patterns across all 8 life dimensions once you have
            enough data. Keep checking in daily to reveal correlations unique to you.
          </p>
        </GlassCard>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : insights.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <InsightCardDS
              key={insight.id}
              headline={insight.headline}
              body={insight.body}
              confidence={insight.confidence}
              dimension={insight.dimension ?? undefined}
              expandedContent={insight.expandedContent}
              onAction={() => {}}
            />
          ))}
          {/* Teaser card when cold */}
          {isCold && (
            <div className="relative bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 overflow-hidden">
              <div className="absolute inset-0 backdrop-blur-sm bg-black/40 rounded-2xl flex items-center justify-center z-10">
                <div className="text-center px-4">
                  <Sparkles className="h-6 w-6 text-primary-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-white">More check-ins required</p>
                </div>
              </div>
              <div className="blur-sm pointer-events-none select-none">
                <div className="h-3 bg-white/10 rounded-full w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded-full w-full mb-1" />
                <div className="h-3 bg-white/10 rounded-full w-5/6" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <GlassCard className="p-8 text-center">
          <Sparkles className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p
            className="text-sm text-slate-500 italic"
            style={{ fontFamily: '"Erode", Georgia, serif' }}
          >
            Continuously monitoring your life patterns…
          </p>
        </GlassCard>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Dimension Overview (8 ScoreRing grid)
// ---------------------------------------------------------------------------
interface DimensionOverviewProps {
  scores: Array<{ dimension: Dimension; score: number; trendDirection: 'up' | 'down' | 'neutral' }>;
  loading: boolean;
}

function DimensionOverview({ scores, loading }: DimensionOverviewProps) {
  const router = useRouter();

  const orderedScores = useMemo(() => {
    const scoreMap: Record<string, number> = {};
    for (const s of scores) {
      scoreMap[s.dimension] = s.score;
    }
    // Sort by score ascending so lowest-priority (needs attention) comes first
    return ALL_DIMENSIONS.map((dim) => ({
      dimension: dim,
      score: scoreMap[dim] ?? 0,
      trendDirection: scores.find((s) => s.dimension === dim)?.trendDirection ?? ('neutral' as const),
    })).sort((a, b) => a.score - b.score);
  }, [scores]);

  return (
    <section aria-label="Dimension Overview">
      <SectionHeader
        title="Life Dimensions"
        subtitle="Click any dimension to explore details and trends"
        action={
          <Link
            href="/dimensions"
            className="text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
          >
            All dimensions <ArrowRight className="h-3 w-3" />
          </Link>
        }
        className="mb-5"
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {ALL_DIMENSIONS.map((d) => (
            <Skeleton key={d} className="h-36" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {orderedScores.map(({ dimension, score, trendDirection }) => {
            const color = dimensionColor(dimension);
            const label = DIMENSION_LABELS[dimension];
            const twColor = DIMENSION_TW_COLORS[dimension] ?? 'slate';

            return (
              <button
                key={dimension}
                onClick={() => router.push(`/dimensions/${dimension}`)}
                className="glass-dark border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-white/20 hover:scale-[1.02] transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                aria-label={`${label}: ${score.toFixed(1)} out of 10. Trend: ${trendDirection}`}
              >
                <ScoreRing
                  score={score}
                  size={72}
                  strokeWidth={6}
                  animate
                />
                <span
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-white transition-colors text-center"
                  style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
                >
                  {label}
                </span>
                <TrendIndicator
                  direction={trendDirection}
                  percent={Math.abs(score - 5) * 10}
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Mood & Energy Trend (Line Chart)
// ---------------------------------------------------------------------------
interface MoodTrendSectionProps {
  moodTrend: Array<{ date: string; mood: number; energy: number }>;
  loading: boolean;
  dataMaturity: 'cold' | 'warming' | 'active' | 'mature';
}

function MoodTrendSection({ moodTrend, loading, dataMaturity }: MoodTrendSectionProps) {
  const isCold = dataMaturity === 'cold';

  const formattedData = useMemo(
    () =>
      moodTrend.map((p) => ({
        ...p,
        dateLabel: new Date(p.date).toLocaleDateString('en-AU', {
          month: 'short',
          day: 'numeric',
        }),
      })),
    [moodTrend]
  );

  return (
    <section aria-label="Mood and Energy Trend">
      <GlassCard className="p-6 h-full">
        <SectionHeader
          title="Mood & Energy"
          subtitle="Last 14 days"
          level="h3"
          className="mb-4"
        />

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-40" />
          </div>
        ) : isCold || formattedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center gap-3">
            <Activity className="h-10 w-10 text-slate-700" />
            <p
              className="text-sm text-slate-500"
              style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
            >
              Complete daily check-ins to see your mood and energy trends over time.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-4 rounded-full bg-primary-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mood</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-4 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Energy</span>
              </div>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 9, fill: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 9, fill: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}
                    axisLine={false}
                    tickLine={false}
                    tickCount={5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15,23,42,0.9)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontFamily: '"JetBrains Mono", monospace',
                      color: '#f1f5f9',
                    }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#818cf8' }}
                    name="Mood"
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#10b981' }}
                    name="Energy"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </GlassCard>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Correlation Spotlight
// ---------------------------------------------------------------------------
interface CorrelationSpotlightSectionProps {
  correlation: {
    feature1: string;
    feature2: string;
    dimension1: string;
    dimension2: string;
    coefficient: number;
    narrative: string;
    confidence: number;
    sampleSize: number;
  } | null;
  loading: boolean;
  dataMaturity: 'cold' | 'warming' | 'active' | 'mature';
}

function CorrelationSpotlightSection({
  correlation,
  loading,
  dataMaturity,
}: CorrelationSpotlightSectionProps) {
  const isCold = dataMaturity === 'cold' || dataMaturity === 'warming';

  const coefficientStrength = (c: number) => {
    const abs = Math.abs(c);
    if (abs >= 0.7) return 'strong';
    if (abs >= 0.4) return 'moderate';
    return 'weak';
  };

  return (
    <section aria-label="Correlation Spotlight">
      <GlassCard className="p-6 h-full">
        <SectionHeader
          title="Correlation Spotlight"
          subtitle="Cross-dimension pattern detected"
          level="h3"
          className="mb-4"
        />

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        ) : isCold || !correlation ? (
          <div className="flex flex-col items-center justify-center h-44 text-center gap-3">
            <TrendingUp className="h-10 w-10 text-slate-700" />
            <p
              className="text-sm text-slate-500 max-w-[220px]"
              style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
            >
              {isCold
                ? 'Need at least 8 check-ins to detect cross-dimension correlations.'
                : 'No significant correlations detected yet. Keep tracking.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Coefficient badge */}
            <div className="flex items-center gap-3">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${correlation.coefficient > 0 ? '#10b981' : '#ef4444'}15` }}
              >
                <span
                  className="text-lg font-black"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: correlation.coefficient > 0 ? '#10b981' : '#ef4444',
                  }}
                >
                  {correlation.coefficient > 0 ? '+' : ''}{correlation.coefficient.toFixed(2)}
                </span>
              </div>
              <div>
                <p
                  className="text-white font-bold text-sm leading-tight"
                  style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
                >
                  {coefficientStrength(correlation.coefficient)} correlation
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                  {Math.round(correlation.confidence * 100)}% confidence — {correlation.sampleSize} data points
                </p>
              </div>
            </div>

            {/* Connected dimensions */}
            <div className="flex items-center gap-2 flex-wrap">
              <DimensionBadge dimension={correlation.dimension1} size="sm" />
              <span className="text-slate-600 font-bold text-xs">linked to</span>
              <DimensionBadge dimension={correlation.dimension2} size="sm" />
            </div>

            {/* Narrative */}
            <p
              className="text-sm text-slate-300 leading-relaxed"
              style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
            >
              {correlation.narrative}
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
              <div className="glass-dark rounded-xl p-3">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">
                  Feature A
                </p>
                <p className="text-xs text-white font-bold capitalize">
                  {correlation.feature1.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="glass-dark rounded-xl p-3">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">
                  Feature B
                </p>
                <p className="text-xs text-white font-bold capitalize">
                  {correlation.feature2.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Quick Actions
// ---------------------------------------------------------------------------
interface QuickActionsSectionProps {
  todaysCheckin: { mood: number; completedAt: string } | null;
  loading: boolean;
}

function QuickActionsSection({ todaysCheckin, loading }: QuickActionsSectionProps) {
  const checkedIn = todaysCheckin !== null;

  return (
    <section aria-label="Quick Actions">
      <div className="flex flex-wrap items-center gap-3">
        {/* Primary: Check In */}
        {loading ? (
          <Skeleton className="h-12 w-36" />
        ) : checkedIn ? (
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-bold text-emerald-400">
              Checked in today
            </span>
            <span className="text-[10px] text-emerald-600 font-bold ml-1">
              {new Date(todaysCheckin.completedAt).toLocaleTimeString('en-AU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ) : (
          <Link
            href="/checkin"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-500 hover:bg-primary-400 text-white font-bold text-sm transition-all hover:scale-[1.02] shadow-lg shadow-primary-500/25"
          >
            <Zap className="h-4 w-4" />
            Check In Now
          </Link>
        )}

        {/* Talk to Mentor */}
        <Link
          href="/mentors"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl glass-dark border border-white/10 text-slate-300 hover:text-white font-bold text-sm transition-all hover:border-white/20 hover:scale-[1.02]"
        >
          <MessageCircle className="h-4 w-4" />
          Talk to Mentor
        </Link>

        {/* View Forecast */}
        <Link
          href="/forecast"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl glass-dark border border-white/10 text-slate-300 hover:text-white font-bold text-sm transition-all hover:border-white/20 hover:scale-[1.02]"
        >
          <BarChart3 className="h-4 w-4" />
          View Forecast
        </Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Upcoming Forecast (7-day bar chart per dimension)
// ---------------------------------------------------------------------------
interface ForecastSectionProps {
  forecast: Array<{
    dimension: string;
    predictedMin: number;
    predictedMax: number;
    alertDip: boolean;
  }>;
  loading: boolean;
  dataMaturity: 'cold' | 'warming' | 'active' | 'mature';
}

function ForecastSection({ forecast, loading, dataMaturity }: ForecastSectionProps) {
  const isCold = dataMaturity === 'cold' || dataMaturity === 'warming';

  // Build chart data from forecast entries
  const chartData = useMemo(() => {
    if (!forecast.length) return [];
    return forecast.map((f) => ({
      dimension: DIMENSION_LABELS[f.dimension as Dimension] ?? f.dimension,
      midpoint: (f.predictedMin + f.predictedMax) / 2,
      range: f.predictedMax - f.predictedMin,
      alertDip: f.alertDip,
      color: dimensionColor(f.dimension),
    }));
  }, [forecast]);

  return (
    <section aria-label="Upcoming Forecast">
      <SectionHeader
        title="7-Day Forecast"
        subtitle="AI-predicted score ranges for your priority dimensions"
        action={
          <Link
            href="/forecast"
            className="text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
          >
            Full forecast <ArrowRight className="h-3 w-3" />
          </Link>
        }
        className="mb-5"
      />

      {loading ? (
        <Skeleton className="h-52" />
      ) : isCold || chartData.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <BarChart3 className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p
            className="text-sm text-slate-500 max-w-sm mx-auto"
            style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
          >
            Forecasts require at least 8 check-ins. Your AI mentor will predict dimension
            trends once there is enough data to model patterns.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="p-6">
          {/* Alert flags */}
          {chartData.some((d) => d.alertDip) && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs font-bold text-amber-400">
                Predicted dip in{' '}
                {chartData
                  .filter((d) => d.alertDip)
                  .map((d) => d.dimension)
                  .join(', ')}
                {' '}— consider proactive action.
              </p>
            </div>
          )}

          {/* Horizontal bar chart */}
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 10]}
                  tick={{ fontSize: 9, fill: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}
                  axisLine={false}
                  tickLine={false}
                  tickCount={6}
                />
                <YAxis
                  type="category"
                  dataKey="dimension"
                  tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15,23,42,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#f1f5f9',
                  }}
                  {...{
                    formatter: (value: unknown, name: unknown) => [
                      typeof value === 'number' ? value.toFixed(1) : String(value),
                      name === 'midpoint' ? 'Predicted score' : 'Range',
                    ],
                  }}
                />
                <Bar
                  dataKey="midpoint"
                  radius={[0, 6, 6, 0]}
                  fill="#6366f1"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/5">
            {chartData.map((d) => (
              <div key={d.dimension} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {d.dimension}
                </span>
                {d.alertDip && (
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Recent Activity Feed
// ---------------------------------------------------------------------------
interface ActivityFeedProps {
  activities: Array<{
    id: string;
    type: 'checkin' | 'achievement' | 'insight';
    description: string;
    timestamp: string;
  }>;
  loading: boolean;
}

const ACTIVITY_ICONS = {
  checkin: CheckCircle2,
  achievement: Zap,
  insight: Sparkles,
};

const ACTIVITY_COLORS = {
  checkin: 'text-emerald-400 bg-emerald-500/10',
  achievement: 'text-amber-400 bg-amber-500/10',
  insight: 'text-primary-400 bg-primary-500/10',
};

function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section aria-label="Recent Activity">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between w-full group mb-4"
        aria-expanded={!collapsed}
      >
        <SectionHeader
          title="Recent Activity"
          subtitle={collapsed ? undefined : 'Your last 5 actions across Life Design OS'}
          level="h3"
        />
        <div className="flex-shrink-0 p-2 glass-dark rounded-xl border border-white/5 group-hover:border-white/20 transition-colors ml-4">
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {!collapsed && (
        <GlassCard className="divide-y divide-white/5 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center">
              <p
                className="text-sm text-slate-500 italic"
                style={{ fontFamily: '"Erode", Georgia, serif' }}
              >
                No recent activity. Start with your first check-in.
              </p>
            </div>
          ) : (
            activities.map((activity) => {
              const IconComponent = ACTIVITY_ICONS[activity.type];
              const colorClass = ACTIVITY_COLORS[activity.type];

              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 hover:bg-white/2 transition-colors"
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm text-white font-medium truncate"
                      style={{ fontFamily: '"Erode", Georgia, serif' }}
                    >
                      {activity.description}
                    </p>
                  </div>
                  <span
                    className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex-shrink-0"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {relativeTime(activity.timestamp)}
                  </span>
                </div>
              );
            })
          )}
        </GlassCard>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------

export default function DashboardClient({
  latestScores,
  overallScore: serverOverallScore,
  streak: serverStreak,
  dimensionTrends,
  recentInsights,
  goalsSummary,
  nudges = [],
  firstName,
}: DashboardClientProps) {
  // Client-side enhanced data (with server-side fallback)
  const {
    insights: clientInsights,
    dimensionScores: clientDimensionScores,
    moodTrend,
    topCorrelation,
    forecast,
    todaysCheckin,
    streak: clientStreak,
    loading,
    error,
    dataMaturity,
    checkinCount,
    recentActivity,
    refetch,
  } = useDashboardData();

  // Merge: prefer client data when available, fall back to server props
  const streak = loading ? serverStreak : clientStreak;

  // Build overall score from client dimension scores if available, else use server value
  const overallScore = useMemo(() => {
    if (!loading && clientDimensionScores.length > 0) {
      const scores = clientDimensionScores
        .filter((d) => d.score > 0)
        .map((d) => ({ dimension: d.dimension, score: d.score }));
      return scores.length > 0 ? computeOverallScore(scores) : serverOverallScore;
    }
    return serverOverallScore;
  }, [loading, clientDimensionScores, serverOverallScore]);

  // Dimension scores: prefer client data
  const dimensionScores = useMemo(() => {
    if (!loading && clientDimensionScores.length > 0) return clientDimensionScores;
    // Fall back to server scores with neutral trend
    return latestScores.map((s) => ({
      dimension: s.dimension as Dimension,
      score: s.score,
      trend: 0,
      trendDirection: 'neutral' as const,
    }));
  }, [loading, clientDimensionScores, latestScores]);

  // Insights: prefer client data over server
  const insights = useMemo(() => {
    if (!loading && clientInsights.length > 0) return clientInsights;
    // Map server insights format to client format
    return recentInsights.map((i) => ({
      id: i.id,
      headline: i.title,
      body: i.body,
      confidence: 0.8,
      dimension: i.dimension,
      expandedContent: undefined,
    }));
  }, [loading, clientInsights, recentInsights]);

  return (
    <div className="space-y-10 animate-fade-in animation-duration-1000">
      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 font-medium flex-1">{error}</p>
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* 1. Header */}
      <HeaderSection
        firstName={firstName}
        streak={streak}
        overallScore={overallScore}
        loading={loading}
      />

      {/* 2. Quick Actions (visible early, above the fold) */}
      <QuickActionsSection todaysCheckin={todaysCheckin} loading={loading} />

      {/* 3. Today's Insights */}
      <InsightsSection
        insights={insights}
        loading={loading}
        dataMaturity={dataMaturity}
        checkinCount={checkinCount}
      />

      {/* 4. Dimension Overview */}
      <DimensionOverview scores={dimensionScores} loading={loading} />

      {/* 5. Mood Trend + Correlation (side by side on wide screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MoodTrendSection
          moodTrend={moodTrend}
          loading={loading}
          dataMaturity={dataMaturity}
        />
        <CorrelationSpotlightSection
          correlation={topCorrelation}
          loading={loading}
          dataMaturity={dataMaturity}
        />
      </div>

      {/* 6. Upcoming Forecast */}
      <ForecastSection
        forecast={forecast}
        loading={loading}
        dataMaturity={dataMaturity}
      />

      {/* 7. Recent Activity Feed */}
      <ActivityFeed activities={recentActivity} loading={loading} />
    </div>
  );
}
