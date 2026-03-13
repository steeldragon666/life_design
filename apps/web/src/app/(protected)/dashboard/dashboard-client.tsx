'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dimension } from '@life-design/core';
import WheelOfLife from '@/components/dashboard/wheel-of-life';
import InsightCard from '@/components/insights/insight-card';
import LifeOrb from '@/components/dashboard/life-orb';
import VoiceCheckin from '@/components/checkin/voice-checkin';
import MicroMomentCard from '@/components/nudges/micro-moment-card';
import CorrelationCards, { type CorrelationInsight } from '@/components/dashboard/correlation-cards';
import TrendCharts from '@/components/dashboard/trend-charts';
import ResilientErrorBoundary, { GlassErrorFallbackCard } from '@/components/error/resilient-error-boundary';
import type { MicroMomentNudge } from '@/lib/micro-moments';
import type { GoalCorrelationInsight, GoalProgressInsight } from '@/lib/goal-correlation';
import type { ConversationMemoryEntry } from '@/lib/conversation-memory';
import type { MentorProfile } from '@/lib/guest-context';
import type {
  WeeklyDigestCheckin,
  WeeklyDigestGoal,
  WeeklyDigestProfile,
  WeeklyDigestSections,
  WeeklyDigestStats,
  WeeklyDigestInsights,
} from '@/lib/weekly-digest';
import { 
  Target, 
  Lightbulb, 
  ArrowRight, 
  Compass,
  MessageCircle,
  Flame,
} from 'lucide-react';

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

interface DigestContext {
  profile: WeeklyDigestProfile | null;
  goals: WeeklyDigestGoal[];
  checkins: WeeklyDigestCheckin[];
  mentorProfile: MentorProfile;
  conversationMemory: ConversationMemoryEntry[];
}

interface WeeklyDigestResponse {
  digest: WeeklyDigestSections;
  stats: WeeklyDigestStats;
  insights: WeeklyDigestInsights;
  source: 'ai' | 'fallback';
  generatedAt: string;
}

interface DashboardClientProps {
  latestScores: { dimension: string; score: number }[];
  overallScore: number;
  streak: number;
  recentInsights: InsightData[];
  goalsSummary?: GoalsSummary;
  nudges?: any[];
  nextMicroMomentNudge?: MicroMomentNudge | null;
  digestContext?: DigestContext;
  profile?: {
    name?: string;
    profession?: string;
  };
  correlationInsights?: CorrelationInsight[];
  highlightedCorrelationPair?: readonly [string, string] | null;
  daysUntilFirstCorrelation?: number;
  goalProgress?: GoalProgressInsight[];
  goalCorrelationInsights?: GoalCorrelationInsight[];
}

const ErrorBoundary = ResilientErrorBoundary as any;
const DISMISSED_INSIGHTS_STORAGE_KEY = 'life-design-dismissed-dashboard-insights';

export default function DashboardClient({
  latestScores,
  overallScore,
  streak,
  recentInsights,
  goalsSummary,
  nudges = [],
  nextMicroMomentNudge = null,
  digestContext,
  profile,
  correlationInsights = [],
  highlightedCorrelationPair = null,
  daysUntilFirstCorrelation = 0,
  goalProgress = [],
  goalCorrelationInsights = [],
}: DashboardClientProps) {
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyDigestResponse | null>(null);
  const [dismissedInsightIds, setDismissedInsightIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(DISMISSED_INSIGHTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  });
  const visibleInsights = recentInsights.filter((insight) => !dismissedInsightIds.includes(insight.id));

  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_INSIGHTS_STORAGE_KEY, JSON.stringify(dismissedInsightIds));
    } catch {
      // Ignore localStorage write failures.
    }
  }, [dismissedInsightIds]);

  const greeting = profile?.name
    ? `Good ${getTimeOfDay()}, ${profile.name.split(' ')[0]}`
    : 'Welcome to Life Design';
  const primaryRoutineLabel = getPrimaryRoutineLabel();
  const mentorSentence = getMentorSentence({
    primaryRoutineLabel,
    streak,
    overallScore,
    goalsSummary,
    profileName: profile?.name,
  });

  async function requestWeeklyDigest() {
    if (!digestContext || digestLoading) return;

    setDigestLoading(true);
    setDigestError(null);
    try {
      const response = await fetch('/api/weekly-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: digestContext.profile,
          goals: digestContext.goals,
          checkins: digestContext.checkins,
          mentorProfile: digestContext.mentorProfile,
          conversationMemory: digestContext.conversationMemory,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to generate weekly digest.');
      }

      setWeeklyDigest(data as WeeklyDigestResponse);
    } catch (error) {
      setDigestError(error instanceof Error ? error.message : 'Failed to generate weekly digest.');
    } finally {
      setDigestLoading(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Today Hero */}
      <div className="glass-card p-6 lg:p-8 rounded-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5 lg:gap-6 items-stretch">
          <div className="space-y-5">
            <span className="badge-blue">Today Focus</span>

            <div>
              <h1 className="text-[30px] lg:text-[36px] font-bold text-white tracking-tight leading-tight">
                {greeting}
              </h1>
              <p className="text-sm text-slate-400 mt-2 max-w-xl">
                {profile?.profession
                  ? `${profile.profession} • Build momentum one intentional step at a time.`
                  : 'A calmer dashboard for your next best action.'}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <p className="text-sm text-blue-300/90 leading-relaxed">
                {mentorSentence}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/checkin" className="btn-primary justify-between py-3 px-4 w-full">
                <span className="inline-flex items-center gap-2">
                  <Compass className="h-4 w-4" />
                  {primaryRoutineLabel}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/mentors" className="btn-secondary justify-center py-3 px-4 w-full">
                <span className="inline-flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Talk to Mentor
                </span>
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatPill label="Harmony" value={`${Math.round(overallScore * 10)}%`} />
              <StatPill label="Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} withFlame />
              <StatPill label="Active Goals" value={`${goalsSummary?.total ?? 0}`} />
            </div>
          </div>

          <ErrorBoundary
            fallback={
              <GlassErrorFallbackCard
                title="Life Orb unavailable"
                description="The 3D visualization hit an issue. You can still use the rest of your dashboard."
                className="h-[400px]"
              />
            }
            resetKeys={[latestScores.length, overallScore]}
          >
            <LifeOrb scores={latestScores} overallScore={overallScore} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Today Support */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <VoiceCheckin />
        </div>
        <div className="lg:col-span-5 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-header mb-0">Today at a glance</h2>
            <Link href="/goals" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              View goals
            </Link>
          </div>

          {nextMicroMomentNudge && <MicroMomentCard nudge={nextMicroMomentNudge} />}

          <div className="rounded-xl p-4 border border-white/10 bg-white/5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Weekly digest
              </p>
              <button
                type="button"
                onClick={requestWeeklyDigest}
                disabled={digestLoading || !digestContext}
                className="text-xs rounded-md border border-blue-400/30 px-2.5 py-1 text-blue-300 hover:text-blue-200 hover:border-blue-300/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {digestLoading ? 'Generating...' : weeklyDigest ? 'Refresh' : 'Generate'}
              </button>
            </div>

            {digestError && <p className="text-xs text-red-400">{digestError}</p>}

            {weeklyDigest ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Wins</p>
                  <ul className="mt-1 space-y-1">
                    {weeklyDigest.digest.wins.slice(0, 2).map((item, index) => (
                      <li key={`digest-win-${index}`} className="text-sm text-slate-300">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Focus next week</p>
                  <ul className="mt-1 space-y-1">
                    {weeklyDigest.digest.focusNextWeek.slice(0, 2).map((item, index) => (
                      <li key={`digest-focus-${index}`} className="text-sm text-slate-300">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-slate-500">
                  Source: {weeklyDigest.source === 'ai' ? 'AI-assisted' : 'Deterministic'} digest
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Generate a weekly summary of wins, patterns, and focus areas from your goals and check-ins.
              </p>
            )}
          </div>

          {goalsSummary?.nearestDeadline ? (
            <div className="rounded-xl p-4 border border-white/10 bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next goal milestone</p>
              <p className="text-sm text-white font-semibold mt-1 truncate">
                {goalsSummary.nearestDeadline.title as string}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Target: {new Date(goalsSummary.nearestDeadline.target_date as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </div>
          ) : (
            <div className="rounded-xl p-4 border border-white/10 bg-white/5">
              <p className="text-sm text-slate-400">No active goals yet. Set one to anchor your next move.</p>
              <Link href="/goals/new" className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block">
                Create a goal
              </Link>
            </div>
          )}

          {visibleInsights.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Mentor insight</p>
              <InsightCard
                insight={visibleInsights[0]}
                onDismiss={(id) => setDismissedInsightIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Insights will appear as you check in.</p>
          )}
        </div>
      </div>

      {/* Secondary Analytics (collapsible) */}
      <details className="glass-card p-5 rounded-2xl group">
        <summary className="list-none cursor-pointer select-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-header mb-0">Trends and planning data</h2>
              <p className="text-xs text-slate-500 mt-1">
                Expand for dimension charts, goal breakdowns, and all suggestions.
              </p>
            </div>
            <span className="text-xs text-slate-400 group-open:hidden">Show</span>
            <span className="text-xs text-slate-300 hidden group-open:inline">Hide</span>
          </div>
        </summary>

        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CorrelationCards
              insights={correlationInsights}
              emptyTitle="Correlation engine is warming up"
              emptyDescription={
                daysUntilFirstCorrelation > 0
                  ? `${daysUntilFirstCorrelation} more day${daysUntilFirstCorrelation === 1 ? '' : 's'} of check-ins until your first statistically meaningful cross-domain pattern.`
                  : 'No statistically significant patterns yet. Keep check-ins consistent to surface insights.'
              }
            />
            <div className="glass-card p-5 space-y-3">
              <h3 className="section-header mb-0">Milestones</h3>
              <p className="text-xs text-slate-500">
                Streak and cadence milestones unlock stronger insight confidence.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[7, 14, 30, 90].map((target) => {
                  const unlocked = streak >= target;
                  return (
                    <div
                      key={`streak-target-${target}`}
                      className={`rounded-xl border p-2 text-center ${
                        unlocked
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      <p className="text-sm font-semibold">{target}d</p>
                      <p className="text-[10px] uppercase tracking-wide">
                        {unlocked ? 'Unlocked' : 'Pending'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ErrorBoundary
              fallback={
                <GlassErrorFallbackCard
                  title="Wheel unavailable"
                  description="This chart encountered an error. Try refreshing after your next check-in."
                  className="h-[400px]"
                />
              }
              resetKeys={[latestScores.length]}
            >
              <WheelOfLife scores={latestScores as { dimension: Dimension; score: number }[]} />
            </ErrorBoundary>
            <TrendCharts
              history={(digestContext?.checkins ?? []).map((checkin) => ({
                date: checkin.date,
                dimension_scores: checkin.dimension_scores,
              }))}
              highlightedCorrelationPair={highlightedCorrelationPair}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg gradient-teal flex items-center justify-center">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="section-header mb-0">Active goals</h3>
                </div>
                <span className="badge-blue">{goalsSummary?.total ?? 0}</span>
              </div>
              {goalsSummary && goalsSummary.total > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <HorizonBadge
                      count={goalsSummary.byHorizon.short}
                      label="Short"
                      color="amber"
                      period="1-6 mo"
                    />
                    <HorizonBadge
                      count={goalsSummary.byHorizon.medium}
                      label="Medium"
                      color="blue"
                      period="6-18 mo"
                    />
                    <HorizonBadge
                      count={goalsSummary.byHorizon.long}
                      label="Long"
                      color="purple"
                      period="1.5-5 yr"
                    />
                  </div>

                  {goalProgress.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Goal timeline momentum</p>
                      {goalProgress.slice(0, 3).map((item) => (
                        <div key={item.goalId} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="truncate pr-2">{item.title}</span>
                            <span>{item.daysRemaining}d left</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full ${
                                item.momentumLabel === 'completed'
                                  ? 'bg-emerald-400'
                                  : item.momentumLabel === 'at_risk'
                                    ? 'bg-amber-400'
                                    : 'bg-cyan-400'
                              }`}
                              style={{ width: `${item.timelineProgressPct}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {item.inferredDimension} focus · {item.timelineProgressPct}% timeline elapsed
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No active goals yet.</p>
              )}
            </div>

            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-purple-400" />
                  </div>
                  <h3 className="section-header mb-0">Insights and suggestions</h3>
                </div>
                <span className="badge-purple">{visibleInsights.length}</span>
              </div>

              {visibleInsights.length > 0 ? (
                <div className="space-y-3">
                  {visibleInsights.slice(0, 3).map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      onDismiss={(id) => setDismissedInsightIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Analyzing your patterns...</p>
              )}

              {goalCorrelationInsights.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Goal ↔ dimension patterns</p>
                  {goalCorrelationInsights.slice(0, 2).map((insight) => (
                    <div key={insight.goalId} className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                      <p className="text-sm font-medium text-blue-300">{insight.title}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{insight.insightText}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        r={insight.coefficient.toFixed(2)} · confidence {Math.round(insight.confidence * 100)}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {nudges.length > 0 && (
                <div className="space-y-3 pt-1">
                  {nudges.slice(0, 2).map((nudge, i) => (
                    <div key={i} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <p className="text-sm font-medium text-amber-400">{nudge.title}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{nudge.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function StatPill({
  label,
  value,
  withFlame = false,
}: {
  label: string;
  value: string;
  withFlame?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
      {withFlame && (
        <div className="text-coral-300">
          <Flame className="h-3.5 w-3.5" />
        </div>
      )}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-xs font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function HorizonBadge({ 
  count, 
  label, 
  color,
  period 
}: { 
  count: number; 
  label: string; 
  color: 'amber' | 'blue' | 'purple';
  period: string;
}) {
  const colors = {
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className={`p-3 rounded-xl border ${colors[color]} text-center`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5">{label}</p>
      <p className="text-[10px] opacity-70 mt-0.5">{period}</p>
    </div>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

function getPrimaryRoutineLabel(): string {
  const hour = new Date().getHours();
  return hour < 16 ? 'Morning Alignment' : 'Evening Wind-Down';
}

function getMentorSentence({
  primaryRoutineLabel,
  streak,
  overallScore,
  goalsSummary,
  profileName,
}: {
  primaryRoutineLabel: string;
  streak: number;
  overallScore: number;
  goalsSummary?: GoalsSummary;
  profileName?: string;
}) {
  const firstName = profileName?.split(' ')[0];
  const opening = firstName ? `${firstName},` : 'Today,';
  const routinePrompt = primaryRoutineLabel === 'Morning Alignment'
    ? 'start with a 2-minute alignment to set your intention.'
    : 'close your day with a short reflection to reset your focus.';
  const momentum = streak > 0
    ? `You are on a ${streak}-day streak.`
    : 'A single check-in today builds momentum.';
  const balance = overallScore > 0
    ? `Your current harmony is ${Math.round(overallScore * 10)}%.`
    : 'Your harmony baseline will appear after your first check-in.';
  const goals = goalsSummary?.total
    ? `${goalsSummary.total} active goal${goalsSummary.total === 1 ? '' : 's'} can guide what matters most.`
    : 'Set one focused goal to give this week direction.';

  return `${opening} ${routinePrompt} ${momentum} ${balance} ${goals}`;
}
