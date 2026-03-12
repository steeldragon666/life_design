'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Dimension, DIMENSION_LABELS, ALL_DIMENSIONS } from '@life-design/core';
import WheelOfLife from '@/components/dashboard/wheel-of-life';
import TrendSparkline from '@/components/dashboard/trend-sparkline';
import StreakCounter from '@/components/dashboard/streak-counter';
import InsightCard from '@/components/insights/insight-card';
import LifeOrb from '@/components/dashboard/life-orb';
import VoiceCheckin from '@/components/checkin/voice-checkin';
import { 
  Target, 
  Lightbulb, 
  TrendingUp, 
  ArrowRight, 
  Sparkles,
  Zap,
  ChevronRight,
  Plus,
  Compass,
  Activity,
  Flame
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

interface DashboardClientProps {
  latestScores: { dimension: string; score: number }[];
  overallScore: number;
  streak: number;
  dimensionTrends: Record<string, { date: string; score: number }[]>;
  recentInsights: InsightData[];
  goalsSummary?: GoalsSummary;
  nudges?: any[];
  profile?: {
    name?: string;
    profession?: string;
  };
}

export default function DashboardClient({
  latestScores,
  overallScore,
  streak,
  dimensionTrends,
  recentInsights,
  goalsSummary,
  nudges = [],
  profile,
}: DashboardClientProps) {
  const greeting = profile?.name 
    ? `Good ${getTimeOfDay()}, ${profile.name.split(' ')[0]}`
    : 'Welcome to Life Design';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section - iOS Large Title Style */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-6 lg:p-8">
        {/* Background Illustration */}
        <div className="absolute -top-10 -right-10 w-72 h-72 lg:w-96 lg:h-96 opacity-50">
          <Image
            src="/images/life-design-hero-illustration.png"
            alt="Life Design"
            width={384}
            height={384}
            className="object-contain"
            priority
          />
        </div>
        
        <div className="relative z-10">
          {/* Time Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-blue flex items-center gap-1.5">
              <Zap className="h-3 w-3" />
              Intelligence Platform
            </span>
          </div>

          {/* Main Title - iOS Large Title */}
          <h1 className="text-[32px] lg:text-[40px] font-bold text-white tracking-tight leading-tight">
            {greeting}
          </h1>
          
          <p className="text-[15px] text-slate-400 mt-2 font-medium leading-relaxed max-w-md">
            {profile?.profession 
              ? `${profile.profession} • Designing your best life`
              : 'Track your goals, gain insights, design your future.'}
          </p>

          {/* Stats Row - iOS Style */}
          <div className="flex items-center gap-3 mt-6">
            {/* Overall Score */}
            <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="relative h-12 w-12">
                <svg className="h-12 w-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="#0a84ff"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(overallScore / 10) * 125.6} 125.6`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                  {Math.round(overallScore * 10)}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Harmony</p>
                <p className="text-sm font-semibold text-white">Score</p>
              </div>
            </div>

            {/* Streak */}
            <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full gradient-coral flex items-center justify-center">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Current</p>
                <p className="text-sm font-semibold text-white">{streak} Day Streak</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - iOS Style Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction 
          href="/checkin" 
          icon={Compass} 
          label="Check In" 
          color="coral"
          subtitle="Daily tracking"
        />
        <QuickAction 
          href="/goals/new" 
          icon={Plus} 
          label="New Goal" 
          color="blue"
          subtitle="Set target"
        />
        <QuickAction 
          href="/insights" 
          icon={Activity} 
          label="Insights" 
          color="purple"
          subtitle="AI analysis"
        />
        <QuickAction 
          href="/goals" 
          icon={Target} 
          label="Goals" 
          color="teal"
          subtitle={goalsSummary?.total ? `${goalsSummary.total} active` : 'View all'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Visualizations */}
        <div className="lg:col-span-7 space-y-6">
          {/* Life Orb & Wheel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LifeOrb scores={latestScores} overallScore={overallScore} />
            <WheelOfLife scores={latestScores as { dimension: Dimension; score: number }[]} />
          </div>

          {/* Voice Checkin - iOS Style Card */}
          <VoiceCheckin />
          
          {/* Dimension Trends */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <h2 className="section-header mb-0">Trends</h2>
                  <p className="text-xs text-slate-500">Last 30 days</p>
                </div>
              </div>
              <span className="badge-blue">{ALL_DIMENSIONS.length} Dimensions</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {/* Right Column - Goals & Insights */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Goals Card */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg gradient-teal flex items-center justify-center">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <h2 className="section-header mb-0">Active Goals</h2>
              </div>
              <Link href="/goals" className="btn-secondary py-2 px-3 text-xs">
                View All
                <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
            
            {goalsSummary && goalsSummary.total > 0 ? (
              <div className="space-y-4">
                {/* Horizon Breakdown */}
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

                {/* Next Priority */}
                {goalsSummary.nearestDeadline && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">Next Priority</p>
                        <p className="text-sm font-semibold text-white mt-1 truncate">
                          {goalsSummary.nearestDeadline.title as string}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Target: {new Date(goalsSummary.nearestDeadline.target_date as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="h-16 w-16 mx-auto mb-3 rounded-2xl bg-slate-800 flex items-center justify-center">
                  <Target className="h-8 w-8 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">No active goals yet</p>
                <Link href="/goals/new" className="btn-primary mt-3 inline-flex">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Goal
                </Link>
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Lightbulb className="h-4 w-4 text-purple-400" />
                </div>
                <h2 className="section-header mb-0">AI Insights</h2>
              </div>
              <span className="badge-purple">{recentInsights.length}</span>
            </div>
            <div className="space-y-3">
              {recentInsights.length > 0 ? (
                recentInsights.slice(0, 3).map((insight) => (
                  <InsightCard key={insight.id} insight={insight} onDismiss={() => {}} />
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500">Analyzing your patterns...</p>
                </div>
              )}
            </div>
          </div>

          {/* Nudges */}
          {nudges.length > 0 && (
            <div className="glass-card p-5 border-amber-500/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </div>
                <h2 className="section-header mb-0">Suggestions</h2>
              </div>
              <div className="space-y-3">
                {nudges.slice(0, 2).map((nudge, i) => (
                  <div key={i} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-sm font-medium text-amber-400">{nudge.title}</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{nudge.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function QuickAction({ 
  href, 
  icon: Icon, 
  label, 
  subtitle,
  color 
}: { 
  href: string; 
  icon: any; 
  label: string; 
  subtitle: string;
  color: 'blue' | 'coral' | 'purple' | 'teal';
}) {
  const gradients = {
    blue: 'from-blue-500 to-blue-600',
    coral: 'from-coral-400 to-coral-500',
    purple: 'from-purple-500 to-purple-600',
    teal: 'from-teal-400 to-teal-500',
  };

  return (
    <Link 
      href={href}
      className="glass-card p-4 flex items-center gap-3 hover:bg-white/8 transition-all group"
    >
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradients[color]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-white transition-colors" />
    </Link>
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
