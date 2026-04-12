'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sun,
  Moon,
  CloudSun,
  CheckCircle,
  Sparkles,
  BookOpen,
  Target,
  Bell,
  ChevronRight,
  Flame,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DimensionScore {
  dimension: string;
  score: number;
}

interface Insight {
  id: string;
  type: string;
  title: string;
  body: string;
  dimension: string | null;
}

interface Goal {
  id: string;
  title: string;
  horizon: string;
  target_date: string | null;
  goal_milestones?: Array<{ id: string; completed: boolean }>;
}

interface Nudge {
  text: string;
  action?: string;
  href?: string;
}

interface TodayFeedProps {
  firstName?: string;
  latestScores: DimensionScore[];
  overallScore: number;
  streak: number;
  recentInsights: Insight[];
  activeGoals: Goal[];
  nudges: Nudge[];
  hasCheckedInToday?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour < 12)
    return { text: 'Good morning', icon: <Sun size={20} className="text-amber-400" /> };
  if (hour < 17)
    return { text: 'Good afternoon', icon: <CloudSun size={20} className="text-amber-500" /> };
  return { text: 'Good evening', icon: <Moon size={20} className="text-indigo-400" /> };
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getMoodEmoji(score: number): string {
  const emojis: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };
  return emojis[Math.round(score)] ?? '😐';
}

const DIMENSION_COLORS: Record<string, string> = {
  career: 'bg-blue-400',
  finance: 'bg-emerald-400',
  health: 'bg-green-400',
  fitness: 'bg-orange-400',
  family: 'bg-pink-400',
  social: 'bg-violet-400',
  romance: 'bg-rose-400',
  growth: 'bg-amber-400',
};

// ---------------------------------------------------------------------------
// Timeline node
// ---------------------------------------------------------------------------

function TimelineNode({ children, color = 'bg-stone-100' }: { children: React.ReactNode; color?: string }) {
  return (
    <div className={`shrink-0 w-10 h-10 rounded-full ${color} flex items-center justify-center z-10`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual cards
// ---------------------------------------------------------------------------

function GreetingCard({ firstName }: { firstName?: string }) {
  const { text, icon } = getGreeting();
  return (
    <div className="flex gap-4">
      <TimelineNode color="bg-amber-50">
        {icon}
      </TimelineNode>
      <div className="flex-1 rounded-2xl bg-gradient-to-r from-sage-50 to-warm-50 border border-sage-200/40 p-5">
        <p className="text-xs text-stone-400 mb-1">{formatDate()}</p>
        <h2 className="font-serif text-2xl text-stone-900">
          {text}{firstName ? `, ${firstName}` : ''}
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          How are you showing up today?
        </p>
      </div>
    </div>
  );
}

function CheckinPromptCard() {
  return (
    <div className="flex gap-4">
      <TimelineNode color="bg-sage-100">
        <CheckCircle size={18} className="text-sage-600" />
      </TimelineNode>
      <Link
        href="/checkin"
        className="flex-1 group rounded-2xl bg-white border border-stone-200 border-l-[3px] border-l-sage-400 p-5 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400">Daily check-in</p>
            <h3 className="font-semibold text-stone-900 mt-0.5">
              Time for your daily check-in
            </h3>
            <p className="text-sm text-stone-500 mt-1">
              Take a moment to reflect on how you&rsquo;re feeling across all dimensions of life.
            </p>
          </div>
          <ChevronRight size={20} className="text-stone-300 group-hover:text-sage-500 transition shrink-0" />
        </div>
      </Link>
    </div>
  );
}

function CheckinSummaryCard({ scores, overallScore }: { scores: DimensionScore[]; overallScore: number }) {
  return (
    <div className="flex gap-4">
      <TimelineNode color="bg-sage-100">
        <CheckCircle size={18} className="text-sage-600" />
      </TimelineNode>
      <div className="flex-1 rounded-2xl bg-white border border-stone-200 border-l-[3px] border-l-sage-400 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-stone-400">Today&rsquo;s check-in</p>
          <span className="text-2xl">{getMoodEmoji(overallScore)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {scores.map((ds) => (
            <div key={ds.dimension} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${DIMENSION_COLORS[ds.dimension] ?? 'bg-stone-300'}`} />
              <span className="text-xs text-stone-600 capitalize">{ds.dimension}</span>
              <span className="text-xs font-mono text-sage-600">{ds.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StreakCard({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <div className="flex gap-4">
      <TimelineNode color="bg-orange-50">
        <Flame size={18} className="text-orange-500" />
      </TimelineNode>
      <div className="flex-1 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/40 p-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-stone-900">{streak}</span>
          <div>
            <p className="text-sm font-medium text-stone-800">day streak</p>
            <p className="text-xs text-stone-500">Keep the momentum going!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="flex gap-4">
      <TimelineNode color="bg-sage-50">
        <Sparkles size={18} className="text-sage-600" />
      </TimelineNode>
      <div className="flex-1 rounded-2xl bg-sage-50/60 border border-sage-200/40 border-l-[3px] border-l-sage-500 p-5">
        <p className="text-xs text-sage-600 font-medium mb-1.5 flex items-center gap-1">
          <Sparkles size={12} />
          Aria noticed
        </p>
        <h3 className="text-sm font-medium text-stone-900">{insight.title}</h3>
        <p className="text-sm text-stone-600 mt-1 line-clamp-2">{insight.body}</p>
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const milestones = goal.goal_milestones ?? [];
  const completed = milestones.filter((m) => m.completed).length;
  const total = milestones.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex gap-4">
      <TimelineNode color="bg-blue-50">
        <Target size={18} className="text-blue-500" />
      </TimelineNode>
      <Link
        href={`/goals/${goal.id}`}
        className="flex-1 group rounded-2xl bg-white border border-stone-200 border-l-[3px] border-l-blue-400 p-4 hover:shadow-sm transition"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-stone-400">Goal</p>
            <h3 className="text-sm font-medium text-stone-900 truncate">{goal.title}</h3>
            {total > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-stone-400">{progress}%</span>
              </div>
            )}
          </div>
          <ChevronRight size={16} className="text-stone-300 group-hover:text-blue-500 transition shrink-0 ml-2" />
        </div>
      </Link>
    </div>
  );
}

function NudgeCard({ nudge }: { nudge: Nudge }) {
  return (
    <div className="flex gap-4">
      <TimelineNode color="bg-warm-50">
        <Bell size={18} className="text-amber-500" />
      </TimelineNode>
      <div className="flex-1 rounded-2xl bg-warm-50 border border-amber-200/30 p-4">
        <p className="text-sm text-stone-700">{nudge.text}</p>
        {nudge.href && (
          <Link
            href={nudge.href}
            className="mt-2 inline-flex text-xs font-medium text-sage-600 hover:text-sage-700"
          >
            {nudge.action ?? 'Take action'} →
          </Link>
        )}
      </div>
    </div>
  );
}

function JournalPromptCard() {
  return (
    <div className="flex gap-4">
      <TimelineNode color="bg-amber-50">
        <BookOpen size={18} className="text-amber-600" />
      </TimelineNode>
      <Link
        href="/journal"
        className="flex-1 group rounded-2xl bg-white border border-stone-200 border-l-[3px] border-l-amber-400 p-5 hover:shadow-sm transition"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400">Journal</p>
            <h3 className="text-sm font-medium text-stone-900">Write about your day</h3>
            <p className="text-xs text-stone-500 mt-1">
              Capture thoughts, reflections, or anything on your mind.
            </p>
          </div>
          <ChevronRight size={16} className="text-stone-300 group-hover:text-amber-500 transition shrink-0" />
        </div>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Feed
// ---------------------------------------------------------------------------

export default function TodayFeed({
  firstName,
  latestScores,
  overallScore,
  streak,
  recentInsights,
  activeGoals,
  nudges,
  hasCheckedInToday = false,
}: TodayFeedProps) {
  // Determine if user has checked in today based on whether scores exist
  const checkedIn = hasCheckedInToday || latestScores.length > 0;

  return (
    <div className="px-5 py-6">
      {/* Timeline feed */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-5 top-10 bottom-10 w-0.5 bg-sage-200/60" />

        <div className="space-y-5">
          {/* 1. Greeting */}
          <GreetingCard firstName={firstName} />

          {/* 2. Check-in (prompt or summary) */}
          {checkedIn ? (
            <CheckinSummaryCard scores={latestScores} overallScore={overallScore} />
          ) : (
            <CheckinPromptCard />
          )}

          {/* 3. Streak */}
          <StreakCard streak={streak} />

          {/* 4. Nudges from Aria */}
          {nudges.slice(0, 2).map((nudge, i) => (
            <NudgeCard key={i} nudge={nudge} />
          ))}

          {/* 5. Insights */}
          {recentInsights.slice(0, 2).map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}

          {/* 6. Active goals (top 3) */}
          {activeGoals.slice(0, 3).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}

          {/* 7. Journal prompt */}
          <JournalPromptCard />
        </div>
      </div>
    </div>
  );
}
