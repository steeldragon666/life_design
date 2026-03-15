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
import useDashboardData from '@/hooks/useDashboardData';
import DashboardInsightsFeed from '@/components/dashboard/DashboardInsightsFeed';
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
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });

// ---------------------------------------------------------------------------
// Inline SVG icons (matching redesign stroke style)
// ---------------------------------------------------------------------------

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
      <path d="M19 17l.5 1.5L21 19l-1.5.5L19 21l-.5-1.5L17 19l1.5-.5L19 17z" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" />
    </svg>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0115-6.7L21 8" />
      <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 01-15 6.7L3 16" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0012 0V2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Dimension styling
// ---------------------------------------------------------------------------

const DIMENSION_STYLE: Record<string, { color: string; bg: string }> = {
  health: { color: '#9BB89B', bg: '#F4F7F4' },
  career: { color: '#5E9BC4', bg: '#F0F6FA' },
  relationships: { color: '#E8A46D', bg: '#FEF7F0' },
  growth: { color: '#8B7BA8', bg: '#F5F0FA' },
  finance: { color: '#D4864A', bg: '#FEF7F0' },
  creativity: { color: '#5A7F5A', bg: '#F4F7F4' },
  spirituality: { color: '#85B8D8', bg: '#F0F6FA' },
  environment: { color: '#A89B7B', bg: '#F9F7F3' },
};

function getDimStyle(dim: string) {
  return DIMENSION_STYLE[dim] ?? { color: '#A8A198', bg: '#F5F3EF' };
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

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#F5F3EF] ${className}`} aria-hidden="true" />;
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

  // Live query for unseen badge count
  const unseenBadgeCount = useLiveQuery(async () => {
    const all = await db.badges.toArray();
    return all.filter(b => !b.context?.includes('seen')).length;
  }) ?? 0;

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
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200/60 mb-6">
          <AlertIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
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
            <h1 className="font-['Instrument_Serif'] text-3xl lg:text-4xl text-[#1A1816]">
              {getGreeting()}
              {firstName ? <>, <span className="text-[#5A7F5A]">{firstName}</span></> : null}
            </h1>
            {unseenBadgeCount > 0 && (
              <Link href="/achievements" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF7F0] text-[#D4864A] text-xs font-medium">
                <TrophyIcon className="w-3.5 h-3.5" />
                {unseenBadgeCount} new
              </Link>
            )}
          </div>
          <p className="text-sm text-[#A8A198] mt-1">{formatToday()} — Here&apos;s your life at a glance</p>
        </div>
        <Link
          href="/checkin"
          className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
        >
          <MicIcon className="w-4 h-4" />
          Voice Check-in
        </Link>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Life Balance Card */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-8 p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-['Instrument_Serif'] text-xl text-[#2A2623]">Life Balance</h2>
            <p className="text-xs text-[#A8A198] mt-0.5">Across 8 dimensions</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Streak */}
            {streak > 0 && (
              <div className="flex items-center gap-1.5">
                <FlameIcon className="w-4 h-4 text-[#D4864A]" />
                <span className="text-sm font-['DM_Mono'] font-medium text-[#D4864A]">{streak}d</span>
              </div>
            )}
            {/* Overall */}
            <div className="text-right">
              <p className="text-3xl font-['Instrument_Serif'] text-[#5A7F5A]">
                {loading ? '—' : Math.round(overallScore)}
              </p>
              <p className="text-[10px] text-[#A8A198] uppercase tracking-wider">Overall</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ALL_DIMENSIONS.map((d) => <Skeleton key={d} className="h-16" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {dimensionScores.map((dim) => {
              const style = getDimStyle(dim.dimension);
              const label = DIMENSION_LABELS[dim.dimension] ?? dim.dimension;
              const score = Math.round(dim.score * 10); // Convert 0-10 to 0-100 for display
              return (
                <div
                  key={dim.dimension}
                  className="group p-3 rounded-xl hover:shadow-sm transition-all cursor-default"
                  style={{ backgroundColor: style.bg }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#5C554C]">{label}</span>
                    <span className="text-xs font-['DM_Mono'] font-medium" style={{ color: style.color }}>
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
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Two-column: AI Insights | Active Goals + Quick Actions */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid lg:grid-cols-5 gap-6 mb-8">
        {/* AI Insights */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="w-4 h-4 text-[#8B7BA8]" />
            <h2 className="font-['Instrument_Serif'] text-xl text-[#2A2623]">AI Insights</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : (
            <DashboardInsightsFeed
              insights={insights.map(i => ({
                id: String(i.id ?? i.headline),
                type: 'suggestion' as const,
                title: i.headline,
                body: i.body,
                dimension: i.dimension ?? null,
              }))}
              activeNudge={activeNudge ? { id: activeNudge.id, title: activeNudge.title, message: activeNudge.message, type: activeNudge.type } : null}
              latestDigest={latestDigest ?? null}
              onDismissInsight={() => {}}
              onDismissNudge={(id) => nudgeScheduler.markAsRead(id)}
              onTalkToMentor={() => {}}
              onViewDigest={() => setShowDigest(true)}
            />
          )}
        </div>

        {/* Active Goals + Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-['Instrument_Serif'] text-xl text-[#2A2623]">Active Goals</h2>
            <Link href="/goals" className="text-xs text-[#5A7F5A] font-medium hover:underline">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : serverGoals.length > 0 ? (
            <div className="space-y-3">
              {serverGoals.slice(0, 3).map((goal) => {
                const progress = goalProgress(goal);
                const dim = goal.goal_dimensions?.[0]?.dimension;
                const dimLabel = dim ? (DIMENSION_LABELS[dim as Dimension] ?? dim) : '';
                return (
                  <div key={goal.id} className="p-4 rounded-2xl bg-white border border-[#E8E4DD]/60 hover:border-[#C4D5C4]/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-[#2A2623]">{goal.title}</p>
                        <p className="text-[10px] text-[#A8A198] mt-0.5">
                          {dimLabel}{dimLabel && goal.target_date ? ' · ' : ''}
                          {goal.target_date ? `Due ${formatDueDate(goal.target_date)}` : ''}
                        </p>
                      </div>
                      <span className="text-xs font-['DM_Mono'] font-medium text-[#5A7F5A]">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-[#F5F3EF] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#9BB89B] to-[#5A7F5A] rounded-full transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60 text-center">
              <p className="text-sm text-[#A8A198] italic font-['Instrument_Serif']">
                No active goals yet
              </p>
              <Link
                href="/goals"
                className="inline-block mt-2 text-xs text-[#5A7F5A] font-medium hover:underline"
              >
                Create your first goal
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F4F7F4] to-[#E4ECE4] border border-[#C4D5C4]/20">
            <p className="text-xs font-medium text-[#5A7F5A] mb-3">Quick Actions</p>
            <div className="space-y-2">
              <Link
                href="/checkin"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 hover:bg-white text-sm text-[#3D3833] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-[#FEF7F0] flex items-center justify-center">
                  <SunIcon className="w-3.5 h-3.5 text-[#D4864A]" />
                </div>
                Daily Check-in
                {todaysCheckin && (
                  <span className="ml-auto text-[10px] text-[#9BB89B] font-medium flex items-center gap-1">
                    <CheckCircleIcon className="w-3 h-3" /> Done
                  </span>
                )}
              </Link>
              <Link
                href="/checkin"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 hover:bg-white text-sm text-[#3D3833] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-[#F0F6FA] flex items-center justify-center">
                  <PenIcon className="w-3.5 h-3.5 text-[#5E9BC4]" />
                </div>
                Journal Entry
              </Link>
              <Link
                href="/checkin"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 hover:bg-white text-sm text-[#3D3833] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-[#F5F0FA] flex items-center justify-center">
                  <MicIcon className="w-3.5 h-3.5 text-[#8B7BA8]" />
                </div>
                Voice Reflection
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
        <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
          <h3 className="font-['Instrument_Serif'] text-lg text-[#2A2623] mb-1">Mood & Energy</h3>
          <p className="text-[10px] text-[#A8A198] uppercase tracking-wider mb-4">Last 14 days</p>

          {loading ? (
            <Skeleton className="h-44" />
          ) : dataMaturity === 'cold' || moodChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-center gap-3">
              <ActivityIcon className="w-10 h-10 text-[#D4CFC5]" />
              <p className="text-sm text-[#A8A198] font-['Instrument_Serif'] italic">
                Complete daily check-ins to see your mood and energy trends.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-4 rounded-full bg-[#5A7F5A]" />
                  <span className="text-[10px] font-medium text-[#A8A198] uppercase tracking-wider">Mood</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-4 rounded-full bg-[#85B8D8]" />
                  <span className="text-[10px] font-medium text-[#A8A198] uppercase tracking-wider">Energy</span>
                </div>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,228,221,0.5)" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 9, fill: '#A8A198', fontFamily: "'DM Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fontSize: 9, fill: '#A8A198', fontFamily: "'DM Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                      tickCount={5}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: '1px solid #E8E4DD',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontFamily: "'DM Mono', monospace",
                        color: '#2A2623',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                      labelStyle={{ color: '#A8A198', marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="mood" stroke="#5A7F5A" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#5A7F5A' }} name="Mood" />
                    <Line type="monotone" dataKey="energy" stroke="#85B8D8" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#85B8D8' }} name="Energy" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {/* Correlation Spotlight */}
        <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
          <h3 className="font-['Instrument_Serif'] text-lg text-[#2A2623] mb-1">Correlation Spotlight</h3>
          <p className="text-[10px] text-[#A8A198] uppercase tracking-wider mb-4">Cross-dimension pattern</p>

          {loading ? (
            <Skeleton className="h-44" />
          ) : (dataMaturity === 'cold' || dataMaturity === 'warming') || !topCorrelation ? (
            <div className="flex flex-col items-center justify-center h-44 text-center gap-3">
              <TrendUpIcon className="w-10 h-10 text-[#D4CFC5]" />
              <p className="text-sm text-[#A8A198] font-['Instrument_Serif'] italic max-w-[220px]">
                {dataMaturity === 'cold' || dataMaturity === 'warming'
                  ? 'Need at least 8 check-ins to detect cross-dimension correlations.'
                  : 'No significant correlations detected yet. Keep tracking.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${topCorrelation.coefficient > 0 ? '#9BB89B' : '#E8A46D'}20` }}
                >
                  <span
                    className="text-lg font-bold font-['DM_Mono']"
                    style={{ color: topCorrelation.coefficient > 0 ? '#5A7F5A' : '#D4864A' }}
                  >
                    {topCorrelation.coefficient > 0 ? '+' : ''}{topCorrelation.coefficient.toFixed(2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#2A2623]">
                    {Math.abs(topCorrelation.coefficient) >= 0.7 ? 'Strong' : Math.abs(topCorrelation.coefficient) >= 0.4 ? 'Moderate' : 'Weak'} correlation
                  </p>
                  <p className="text-[10px] text-[#A8A198] uppercase tracking-wider font-medium mt-0.5">
                    {Math.round(topCorrelation.confidence * 100)}% confidence — {topCorrelation.sampleSize} data points
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F7F4] text-[#5A7F5A] font-medium">
                  {DIMENSION_LABELS[topCorrelation.dimension1 as Dimension] ?? topCorrelation.dimension1}
                </span>
                <span className="text-[10px] text-[#A8A198] font-medium">linked to</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F7F4] text-[#5A7F5A] font-medium">
                  {DIMENSION_LABELS[topCorrelation.dimension2 as Dimension] ?? topCorrelation.dimension2}
                </span>
              </div>

              <p className="text-sm text-[#7D756A] leading-relaxed font-['Instrument_Serif'] italic">
                {topCorrelation.narrative}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Weekly Rhythm */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-8 p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
        <h2 className="font-['Instrument_Serif'] text-xl text-[#2A2623] mb-4">This Week&apos;s Rhythm</h2>

        {loading ? (
          <Skeleton className="h-32" />
        ) : moodTrend.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-center">
            <p className="text-sm text-[#A8A198] font-['Instrument_Serif'] italic">
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
                      className={`w-full rounded-lg transition-all ${isToday ? 'bg-gradient-to-t from-[#5A7F5A] to-[#9BB89B]' : 'bg-[#E4ECE4]'}`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? 'text-[#5A7F5A]' : 'text-[#A8A198]'}`}>
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
            <h2 className="font-['Instrument_Serif'] text-xl text-[#2A2623]">Recent Activity</h2>
            {!activityCollapsed && (
              <p className="text-xs text-[#A8A198] mt-0.5">Your last 5 actions</p>
            )}
          </div>
          <div className="flex-shrink-0 p-2 rounded-xl border border-[#E8E4DD]/60 group-hover:border-[#C4D5C4]/50 transition-colors ml-4">
            {activityCollapsed
              ? <ChevronDownIcon className="w-4 h-4 text-[#A8A198]" />
              : <ChevronUpIcon className="w-4 h-4 text-[#A8A198]" />
            }
          </div>
        </button>

        {!activityCollapsed && (
          <div className="rounded-2xl bg-white border border-[#E8E4DD]/60 divide-y divide-[#E8E4DD]/40 overflow-hidden">
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
                <p className="text-sm text-[#A8A198] italic font-['Instrument_Serif']">
                  No recent activity. Start with your first check-in.
                </p>
              </div>
            ) : (
              recentActivity.map((activity) => {
                const iconConfig = {
                  checkin: { icon: CheckCircleIcon, bg: 'bg-[#F4F7F4]', color: 'text-[#5A7F5A]' },
                  achievement: { icon: FlameIcon, bg: 'bg-[#FEF7F0]', color: 'text-[#D4864A]' },
                  insight: { icon: SparklesIcon, bg: 'bg-[#F5F0FA]', color: 'text-[#8B7BA8]' },
                }[activity.type] ?? { icon: CheckCircleIcon, bg: 'bg-[#F4F7F4]', color: 'text-[#5A7F5A]' };
                const Icon = iconConfig.icon;

                return (
                  <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-[#FAFAF8] transition-colors">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconConfig.bg}`}>
                      <Icon className={`w-4 h-4 ${iconConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#2A2623] font-medium truncate">{activity.description}</p>
                    </div>
                    <span className="text-[10px] text-[#A8A198] font-['DM_Mono'] font-medium flex-shrink-0">
                      {relativeTime(activity.timestamp)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Weekly Digest modal */}
      {/* ------------------------------------------------------------------ */}
      {showDigest && latestDigest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto m-4 rounded-2xl bg-white shadow-xl">
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
