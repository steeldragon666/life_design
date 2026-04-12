'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Dimension,
  DIMENSION_LABELS,
  ALL_DIMENSIONS,
  computeOverallScore,
} from '@life-design/core';
import { Card, Badge, Skeleton, colors, dimensionPalettes } from '@life-design/ui';
import {
  Sparkles,
  Mic,
  Sun,
  PenLine,
  Flame,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Activity,
  BookOpen,
} from 'lucide-react';
import useDashboardData from '@/hooks/useDashboardData';
import WeeklyDigestView from '@/components/digest/WeeklyDigestView';
import type { StoredDigest } from '@/lib/digest/digest-generator';
import { useNudges } from '@/providers/LifeDesignProvider';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Dynamic recharts imports (SSR-safe)
// ---------------------------------------------------------------------------
const LineChart = dynamic(() => import('recharts').then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const RechartsTooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });

// ---------------------------------------------------------------------------
// Dimension styling — uses dimensionPalettes from @life-design/ui
// ---------------------------------------------------------------------------

function getDimStyle(dim: string): { color: string; bg: string } {
  const palette = dimensionPalettes[dim as Dimension];
  if (palette) return { color: palette.accent, bg: palette.bg };
  return { color: colors.stone[400], bg: colors.stone[100] };
}

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

interface ActiveGoal {
  id: string;
  title: string;
  horizon: string;
  target_date: string | null;
  goal_dimensions?: Array<{ dimension: string }>;
  goal_milestones?: Array<{ id: string; completed: boolean }>;
}

interface DashboardClientProps {
  latestScores: { dimension: string; score: number }[];
  overallScore: number;
  streak: number;
  dimensionTrends: Record<string, { date: string; score: number }[]>;
  recentInsights: InsightData[];
  goalsSummary?: GoalsSummary;
  activeGoals?: ActiveGoal[];
  nudges?: unknown[];
  firstName?: string;
  userProfile?: {
    frictionIndex: number;
    structureNeed: number;
    dropoutRisk: number;
    motivationType: string;
    chronotype: string;
    actionOrientation: number;
    summaryTemplate: { strength: string; friction: string; strategy: string; this_week: string } | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

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

function goalProgress(goal: ActiveGoal): number {
  const milestones = goal.goal_milestones ?? [];
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.completed).length;
  return Math.round((completed / milestones.length) * 100);
}

function formatDueDate(date: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Inline insights feed (replaces missing DashboardInsightsFeed component)
// ---------------------------------------------------------------------------

interface NudgeData {
  id: string;
  title: string;
  message: string;
  type: string;
}

interface FeedInsight {
  id: string;
  type: 'trend' | 'correlation' | 'suggestion' | 'goal_progress' | 'goal_risk';
  title: string;
  body: string;
  dimension: string | null;
}

function InsightsFeed({
  insights,
  activeNudge,
  latestDigest,
  onDismissNudge,
  onViewDigest,
}: {
  insights: FeedInsight[];
  activeNudge: NudgeData | null;
  latestDigest: StoredDigest | null;
  onDismissInsight: (id: string) => void;
  onDismissNudge: (id: string) => void;
  onTalkToMentor: () => void;
  onViewDigest: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Nudge banner */}
      {activeNudge && (
        <Card className="p-4 border-l-4 border-l-sage-300 bg-sage-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-stone-800">{activeNudge.title}</p>
              <p className="text-xs text-stone-600 mt-0.5">{activeNudge.message}</p>
            </div>
            <button
              onClick={() => onDismissNudge(activeNudge.id)}
              className="text-stone-500 hover:text-stone-600 text-xs flex-shrink-0"
            >
              ×
            </button>
          </div>
        </Card>
      )}

      {/* Weekly digest prompt */}
      {latestDigest && (
        <Card className="p-4 bg-stone-50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-700">Weekly digest ready</p>
            <button
              onClick={onViewDigest}
              className="text-xs text-sage-500 font-medium hover:underline"
            >
              View
            </button>
          </div>
        </Card>
      )}

      {/* Insights */}
      {insights.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-stone-500 italic font-serif">
            Complete more check-ins to unlock AI insights.
          </p>
        </Card>
      ) : (
        insights.map((insight) => (
          <Card key={insight.id} className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles size={16} className="text-accent-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-stone-800">{insight.title}</p>
                  {insight.dimension && (
                    <Badge variant="sage">
                      {DIMENSION_LABELS[insight.dimension as Dimension] ?? insight.dimension}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">{insight.body}</p>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
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
  activeGoals: serverGoals = [],
  nudges = [],
  firstName,
  userProfile,
}: DashboardClientProps) {
  const {
    insights: clientInsights,
    dimensionScores: clientDimensionScores,
    moodTrend,
    topCorrelation,
    todaysCheckin,
    streak: clientStreak,
    loading,
    error,
    dataMaturity,
    checkinCount,
    recentActivity,
    refetch,
  } = useDashboardData();

  const nudgeScheduler = useNudges();
  const [showDigest, setShowDigest] = useState(false);

  // Live query for latest digest
  const latestDigest = useLiveQuery(async () => {
    // digests table may not exist yet
    try {
      return await (db as any).digests?.orderBy('generatedAt').reverse().first();
    } catch { return undefined; }
  }) as StoredDigest | undefined;

  // Active nudge from scheduler
  const activeNudge = useLiveQuery(async () => {
    const nudge = await nudgeScheduler.getActiveNudge();
    if (!nudge) return null;
    return { id: nudge.id!, title: nudge.title, message: nudge.message, type: nudge.type };
  });

  // Merge: prefer client data when available, fall back to server props
  const streak = loading ? serverStreak : clientStreak;

  const overallScore = useMemo(() => {
    if (!loading && clientDimensionScores.length > 0) {
      const scores = clientDimensionScores
        .filter((d) => d.score > 0)
        .map((d) => ({ dimension: d.dimension, score: d.score }));
      return scores.length > 0 ? computeOverallScore(scores) : serverOverallScore;
    }
    return serverOverallScore;
  }, [loading, clientDimensionScores, serverOverallScore]);

  const dimensionScores = useMemo(() => {
    if (!loading && clientDimensionScores.length > 0) return clientDimensionScores;
    return latestScores.map((s) => ({
      dimension: s.dimension as Dimension,
      score: s.score,
      trend: 0,
      trendDirection: 'neutral' as const,
    }));
  }, [loading, clientDimensionScores, latestScores]);

  const insights = useMemo(() => {
    if (!loading && clientInsights.length > 0) return clientInsights;
    return recentInsights.map((i) => ({
      id: i.id,
      headline: i.title,
      body: i.body,
      confidence: 0.8,
      dimension: i.dimension,
    }));
  }, [loading, clientInsights, recentInsights]);

  // Mood trend chart data
  const moodChartData = useMemo(
    () => moodTrend.map((p) => ({
      ...p,
      dateLabel: new Date(p.date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }),
    })),
    [moodTrend],
  );

  // Activity feed
  const [activityCollapsed, setActivityCollapsed] = useState(false);

  // Today info
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0 index

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-5xl">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-[16px] bg-red-50 border border-red-200/60 mb-6">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-3xl lg:text-4xl text-stone-900">
              {getGreeting()}
              {firstName ? <>, <span className="text-sage-500">{firstName}</span></> : null}
            </h1>
          </div>
          <p className="text-sm text-stone-500 mt-1">{formatToday()} — Here&apos;s your life at a glance</p>
        </div>
        <Link
          href="/checkin"
          className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-[16px] bg-gradient-to-r from-sage-500 to-sage-600 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <Mic size={16} />
          Voice Check-in
        </Link>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Life Balance Card */}
      {/* ------------------------------------------------------------------ */}
      <Card className="mb-8 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-serif text-xl text-stone-800">Life Balance</h2>
            <p className="text-xs text-stone-500 mt-0.5">Across 8 dimensions</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Streak */}
            {streak > 0 && (
              <div className="flex items-center gap-1.5">
                <Flame size={16} className="text-warm-500" />
                <span className="text-sm font-mono font-medium text-warm-500">{streak}d</span>
              </div>
            )}
            {/* Overall */}
            <div className="text-right">
              <p className="text-3xl font-serif text-sage-500">
                {loading ? '—' : Math.round(overallScore)}
              </p>
              <p className="text-[11px] text-stone-500 uppercase tracking-wider">Overall</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ALL_DIMENSIONS.map((d) => <Skeleton key={d} className="h-16 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {dimensionScores.map((dim) => {
              const style = getDimStyle(dim.dimension);
              const label = DIMENSION_LABELS[dim.dimension] ?? dim.dimension;
              const score = Math.round(dim.score * 20); // Convert 1-5 to 0-100 for display
              return (
                <div
                  key={dim.dimension}
                  className="group p-3 rounded-xl hover:shadow-sm transition-all cursor-default"
                  style={{ backgroundColor: style.bg }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-stone-600">{label}</span>
                    <span className="text-xs font-mono font-medium" style={{ color: style.color }}>
                      {score}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/80 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${score}%`, backgroundColor: style.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Two-column: AI Insights | Active Goals + Quick Actions + Schedule */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid lg:grid-cols-5 gap-6 mb-8">
        {/* AI Insights */}
        <div className="lg:col-span-3 space-y-4">
          {/* Personalized Profile Insight */}
          {userProfile?.summaryTemplate && !loading && (
            <Card className="p-4 bg-gradient-to-r from-sage-50 to-sage-100/50 border-l-4 border-l-sage-400">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={16} className="text-sage-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800">Your Profile Insight</p>
                  <p className="text-sm text-stone-600 mt-1">{userProfile.summaryTemplate.strategy}</p>
                  {userProfile.dropoutRisk > 0.6 && (
                    <p className="text-xs text-warm-600 mt-2 font-medium">
                      High dropout risk detected. Let's start with one tiny daily action.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-accent-600" />
            <h2 className="font-serif text-xl text-stone-800">AI Insights</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 rounded-[16px]" />
              <Skeleton className="h-28 rounded-[16px]" />
              <Skeleton className="h-28 rounded-[16px]" />
            </div>
          ) : (
            <InsightsFeed
              insights={insights.map(i => ({
                id: String(i.id ?? i.headline),
                type: 'suggestion' as const,
                title: i.headline,
                body: i.body,
                dimension: i.dimension ?? null,
              }))}
              activeNudge={activeNudge ? { id: String(activeNudge.id), title: activeNudge.title, message: activeNudge.message, type: activeNudge.type } : null}
              latestDigest={latestDigest ?? null}
              onDismissInsight={() => {}}
              onDismissNudge={(id) => nudgeScheduler.markAsRead(id)}
              onTalkToMentor={() => {}}
              onViewDigest={() => setShowDigest(true)}
            />
          )}
        </div>

        {/* Active Goals + Quick Actions + Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-serif text-xl text-stone-800">Active Goals</h2>
            <Link href="/goals" className="text-xs text-sage-500 font-medium hover:underline">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-[16px]" />
              <Skeleton className="h-24 rounded-[16px]" />
            </div>
          ) : serverGoals.length > 0 ? (
            <div className="space-y-3">
              {serverGoals.slice(0, 3).map((goal) => {
                const progress = goalProgress(goal);
                const dim = goal.goal_dimensions?.[0]?.dimension;
                const dimLabel = dim ? (DIMENSION_LABELS[dim as Dimension] ?? dim) : '';
                return (
                  <Card key={goal.id} className="p-4 hover:border-sage-200 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-stone-800">{goal.title}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {dimLabel}{dimLabel && goal.target_date ? ' · ' : ''}
                          {goal.target_date ? `Due ${formatDueDate(goal.target_date)}` : ''}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-medium text-sage-500">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sage-300 to-sage-500 rounded-full transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-stone-500 italic font-serif">
                No active goals yet
              </p>
              <Link
                href="/goals"
                className="inline-block mt-2 text-xs text-sage-500 font-medium hover:underline"
              >
                Create your first goal
              </Link>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="p-4 rounded-[16px] bg-gradient-to-br from-sage-50 to-sage-100 border border-sage-200/20">
            <p className="text-xs font-medium text-sage-500 mb-3">Quick Actions</p>
            <div className="space-y-2">
              <Link
                href="/checkin"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 hover:bg-white text-sm text-stone-700 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-warm-50 flex items-center justify-center">
                  <Sun size={14} className="text-warm-500" />
                </div>
                Daily Check-in
                {todaysCheckin && (
                  <span className="ml-auto text-[11px] text-sage-500 font-medium flex items-center gap-1">
                    <CheckCircle size={12} /> Done
                  </span>
                )}
              </Link>
              <Link
                href="/journal"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 hover:bg-white text-sm text-stone-700 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-accent-400/10 flex items-center justify-center">
                  <BookOpen size={14} className="text-accent-500" />
                </div>
                Journal Entry
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Mood & Energy Trend + Correlation Spotlight */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Mood & Energy */}
        <Card className="p-6">
          <h3 className="font-serif text-lg text-stone-800 mb-1">Mood & Energy</h3>
          <p className="text-[11px] text-stone-500 uppercase tracking-wider mb-4">Last 14 days</p>

          {loading ? (
            <Skeleton className="h-44 rounded-xl" />
          ) : dataMaturity === 'cold' || moodChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-center gap-3">
              <Activity size={40} className="text-stone-300" />
              <p className="text-sm text-stone-500 font-serif italic">
                Complete daily check-ins to see your mood and energy trends.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-4 rounded-full bg-sage-500" />
                  <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Mood</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-4 rounded-full bg-accent-400" />
                  <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Energy</span>
                </div>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${colors.stone[200]}80`} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 9, fill: colors.stone[400], fontFamily: 'monospace' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fontSize: 9, fill: colors.stone[400], fontFamily: 'monospace' }}
                      axisLine={false}
                      tickLine={false}
                      tickCount={5}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: `1px solid ${colors.stone[200]}`,
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: colors.stone[800],
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                      labelStyle={{ color: colors.stone[400], marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="mood" stroke={colors.sage[500]} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: colors.sage[500] }} name="Mood" />
                    <Line type="monotone" dataKey="energy" stroke={colors.accent[400]} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: colors.accent[400] }} name="Energy" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Card>

        {/* Correlation Spotlight */}
        <Card className="p-6">
          <h3 className="font-serif text-lg text-stone-800 mb-1">Correlation Spotlight</h3>
          <p className="text-[11px] text-stone-500 uppercase tracking-wider mb-4">Cross-dimension pattern</p>

          {loading ? (
            <Skeleton className="h-44 rounded-xl" />
          ) : (dataMaturity === 'cold' || dataMaturity === 'warming') || !topCorrelation ? (
            <div className="flex flex-col items-center justify-center h-44 text-center gap-3">
              <TrendingUp size={40} className="text-stone-300" />
              <p className="text-sm text-stone-500 font-serif italic max-w-[220px]">
                {dataMaturity === 'cold' || dataMaturity === 'warming'
                  ? 'Need at least 8 check-ins to detect cross-dimension correlations.'
                  : 'No significant correlations detected yet. Keep tracking.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-14 w-14 rounded-[16px] flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${topCorrelation.coefficient > 0 ? colors.sage[300] : colors.warm[300]}20` }}
                >
                  <span
                    className="text-lg font-bold font-mono"
                    style={{ color: topCorrelation.coefficient > 0 ? colors.sage[500] : colors.warm[400] }}
                  >
                    {topCorrelation.coefficient > 0 ? '+' : ''}{topCorrelation.coefficient.toFixed(2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-800">
                    {Math.abs(topCorrelation.coefficient) >= 0.7 ? 'Strong' : Math.abs(topCorrelation.coefficient) >= 0.4 ? 'Moderate' : 'Weak'} correlation
                  </p>
                  <p className="text-[11px] text-stone-500 uppercase tracking-wider font-medium mt-0.5">
                    {Math.round(topCorrelation.confidence * 100)}% confidence — {topCorrelation.sampleSize} data points
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="sage">
                  {DIMENSION_LABELS[topCorrelation.dimension1 as Dimension] ?? topCorrelation.dimension1}
                </Badge>
                <span className="text-[11px] text-stone-500 font-medium">linked to</span>
                <Badge variant="sage">
                  {DIMENSION_LABELS[topCorrelation.dimension2 as Dimension] ?? topCorrelation.dimension2}
                </Badge>
              </div>

              <p className="text-sm text-stone-600 leading-relaxed font-serif italic">
                {topCorrelation.narrative}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Weekly Rhythm */}
      {/* ------------------------------------------------------------------ */}
      <Card className="mb-8 p-6">
        <h2 className="font-serif text-xl text-stone-800 mb-4">This Week&apos;s Rhythm</h2>

        {loading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : moodTrend.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-center">
            <p className="text-sm text-stone-500 font-serif italic">
              Start checking in to see your weekly rhythm
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              // Use mood data for bars, falling back to proportional heights
              const dayData = moodTrend[moodTrend.length - 7 + i];
              const height = dayData ? (dayData.mood / 10) * 100 : 0;
              const isToday = i === dayIndex;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-lg transition-all ${isToday ? 'bg-gradient-to-t from-sage-500 to-sage-300' : 'bg-sage-100'}`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-medium ${isToday ? 'text-sage-500' : 'text-stone-500'}`}>
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Recent Activity */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-8">
        <button
          onClick={() => setActivityCollapsed((c) => !c)}
          className="flex items-center justify-between w-full group mb-4"
          aria-expanded={!activityCollapsed}
        >
          <div>
            <h2 className="font-serif text-xl text-stone-800">Recent Activity</h2>
            {!activityCollapsed && (
              <p className="text-xs text-stone-500 mt-0.5">Your last 5 actions</p>
            )}
          </div>
          <div className="flex-shrink-0 p-2 rounded-xl border border-stone-200/60 group-hover:border-sage-200/50 transition-colors ml-4">
            {activityCollapsed
              ? <ChevronDown size={16} className="text-stone-500" />
              : <ChevronUp size={16} className="text-stone-500" />
            }
          </div>
        </button>

        {!activityCollapsed && (
          <Card className="p-0 divide-y divide-stone-200/40 overflow-hidden">
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
            ) : recentActivity.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-stone-500 italic font-serif">
                  No recent activity. Start with your first check-in.
                </p>
              </div>
            ) : (
              recentActivity.map((activity) => {
                const iconConfig = {
                  checkin: { icon: CheckCircle, bg: 'bg-sage-50', color: 'text-sage-500' },
                  achievement: { icon: Flame, bg: 'bg-warm-50', color: 'text-warm-500' },
                  insight: { icon: Sparkles, bg: 'bg-stone-100', color: 'text-stone-500' },
                }[activity.type] ?? { icon: CheckCircle, bg: 'bg-sage-50', color: 'text-sage-500' };
                const Icon = iconConfig.icon;

                return (
                  <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-stone-50 transition-colors">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconConfig.bg}`}>
                      <Icon size={16} className={iconConfig.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-800 font-medium truncate">{activity.description}</p>
                    </div>
                    <span className="text-[11px] text-stone-500 font-mono font-medium flex-shrink-0">
                      {relativeTime(activity.timestamp)}
                    </span>
                  </div>
                );
              })
            )}
          </Card>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Weekly Digest modal */}
      {/* ------------------------------------------------------------------ */}
      {showDigest && latestDigest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto m-4 rounded-[16px] bg-white shadow-xl">
            <WeeklyDigestView
              digest={latestDigest}
              onClose={() => setShowDigest(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
