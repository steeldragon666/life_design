'use client';

import Link from 'next/link';
import { Dimension, DIMENSION_LABELS, ALL_DIMENSIONS } from '@life-design/core';
import WheelOfLife from '@/components/dashboard/wheel-of-life';
import TrendSparkline from '@/components/dashboard/trend-sparkline';
import StreakCounter from '@/components/dashboard/streak-counter';
import InsightCard from '@/components/insights/insight-card';
import LifeOrb from '@/components/dashboard/life-orb';
import VoiceCheckin from '@/components/checkin/voice-checkin';
import { Target, Lightbulb, TrendingUp, ArrowRight, Sparkles } from 'lucide-react';

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
  nudges?: any[];
}

export default function DashboardClient({
  latestScores,
  overallScore,
  streak,
  dimensionTrends,
  recentInsights,
  goalsSummary,
  nudges = [],
}: DashboardClientProps) {
  return (
    <div className="space-y-10 animate-fade-in animation-duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-400 mt-2 font-medium">
            Welcome back. Your evolution is in progress.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="glass rounded-2xl px-6 py-3 flex flex-col items-center border-white/5">
            <span className="text-2xl font-bold text-primary-400">{overallScore.toFixed(1)}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Overall</span>
          </div>
          <StreakCounter streak={streak} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Primary View: Wheel of Life & 3D Orb */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <LifeOrb scores={latestScores} overallScore={overallScore} />
            <WheelOfLife scores={latestScores as { dimension: Dimension; score: number }[]} />
          </div>

          <VoiceCheckin />
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary-400" />
                <h2 className="text-xl font-bold text-white">Dimension Trends</h2>
              </div>
              <span className="text-xs font-medium text-slate-500">Last 30 Days</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ALL_DIMENSIONS.slice(0, 4).map((dim) => (
                <TrendSparkline
                  key={dim}
                  label={DIMENSION_LABELS[dim]}
                  data={dimensionTrends[dim] ?? []}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Info Sidebar: Goals & Insights */}
        <div className="lg:col-span-4 space-y-8">
          {/* Active Goals */}
          <div className="glass-card border-primary-500/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-primary-400">
                <Target className="h-5 w-5" />
                <h2 className="text-lg font-bold text-white">Active Goals</h2>
              </div>
              <Link href="/goals" className="p-1.5 glass rounded-lg hover:bg-white/5 transition-all">
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
            
            {goalsSummary && goalsSummary.total > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 text-center">
                    <p className="text-xl font-bold text-white">{goalsSummary.byHorizon.short}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Short</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 text-center">
                    <p className="text-xl font-bold text-white">{goalsSummary.byHorizon.medium}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Med</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 text-center">
                    <p className="text-xl font-bold text-white">{goalsSummary.byHorizon.long}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Long</p>
                  </div>
                </div>
                {goalsSummary.nearestDeadline && (
                  <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                    <p className="text-xs font-semibold text-primary-300">Next Priority</p>
                    <p className="text-sm font-medium text-white truncate my-1">
                      {goalsSummary.nearestDeadline.title as string}
                    </p>
                    <p className="text-[10px] text-primary-400 uppercase font-bold tracking-tight">
                      Target: {new Date(goalsSummary.nearestDeadline.target_date as string).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No active goals yet.</p>
            )}
          </div>

          {/* Proactive Nudges */}
          {nudges.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-lg font-bold text-white">Proactive Nudges</h2>
              </div>
              <div className="space-y-3">
                {nudges.map((nudge, i) => (
                  <div key={i} className="glass-card border-amber-500/10 p-4 space-y-1">
                    <h4 className="font-bold text-amber-400 text-sm">
                      {nudge.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      {nudge.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Insights */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-400">
                <Lightbulb className="h-5 w-5" />
                <h2 className="text-lg font-bold text-white">AI Insights</h2>
              </div>
            </div>
            <div className="space-y-4">
              {recentInsights.length > 0 ? (
                recentInsights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} onDismiss={() => {}} />
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">Analyzing your life patterns...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
