'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Sun,
  Moon,
  CheckCircle,
  Sparkles,
  BookOpen,
  Target,
  Bell,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOOD_MAP: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '\u{1F614}', label: 'Struggling' },
  2: { emoji: '\u{1F615}', label: 'Low' },
  3: { emoji: '\u{1F610}', label: 'Okay' },
  4: { emoji: '\u{1F642}', label: 'Good' },
  5: { emoji: '\u{1F60A}', label: 'Great' },
};

function getGreeting(time: string): { text: string; Icon: LucideIcon } {
  const hour = new Date(time).getHours();
  if (hour < 12) return { text: 'Good morning', Icon: Sun };
  if (hour < 17) return { text: 'Good afternoon', Icon: Sun };
  return { text: 'Good evening', Icon: Moon };
}

function formatDate(time: string): string {
  return new Date(time).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(time: string): string {
  return new Date(time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Dimension score dot colors
// ---------------------------------------------------------------------------

const DIMENSION_COLORS: Record<string, string> = {
  career: 'bg-[var(--color-dim-career)]',
  finance: 'bg-[var(--color-dim-finance)]',
  health: 'bg-[var(--color-dim-health)]',
  fitness: 'bg-[var(--color-dim-fitness)]',
  family: 'bg-[var(--color-dim-family)]',
  social: 'bg-[var(--color-dim-social)]',
  romance: 'bg-[var(--color-dim-romance)]',
  growth: 'bg-[var(--color-dim-growth)]',
};

// ---------------------------------------------------------------------------
// TimelineWrapper
// ---------------------------------------------------------------------------

interface TimelineWrapperProps {
  children: React.ReactNode;
}

export function TimelineWrapper({ children }: TimelineWrapperProps) {
  return (
    <div className="relative">
      {/* Vertical connecting line */}
      <div
        className="absolute left-8 top-0 bottom-0 w-0.5 bg-sage-200"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimelineNode
// ---------------------------------------------------------------------------

interface TimelineNodeProps {
  icon: LucideIcon;
  color: string;
}

export function TimelineNode({ icon: Icon, color }: TimelineNodeProps) {
  return (
    <div
      className={`
        relative z-10 flex h-10 w-10 shrink-0 items-center justify-center
        rounded-full ${color} text-white shadow-sm
      `}
      aria-hidden="true"
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared card wrapper
// ---------------------------------------------------------------------------

interface CardShellProps {
  children: React.ReactNode;
  borderColor: string;
  nodeIcon: LucideIcon;
  nodeColor: string;
  className?: string;
}

function CardShell({
  children,
  borderColor,
  nodeIcon,
  nodeColor,
  className = '',
}: CardShellProps) {
  return (
    <div className="flex gap-4">
      <TimelineNode icon={nodeIcon} color={nodeColor} />
      <div
        className={`
          min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white
          transition-shadow hover:shadow-sm
          ${borderColor} ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GreetingCard
// ---------------------------------------------------------------------------

interface GreetingCardProps {
  name: string;
  time: string;
}

export function GreetingCard({ name, time }: GreetingCardProps) {
  const { text, Icon } = getGreeting(time);

  return (
    <CardShell
      borderColor="border-l-[3px] border-l-sage-400"
      nodeIcon={Icon}
      nodeColor="bg-sage-400"
      className="bg-gradient-to-br from-warm-50 via-white to-sage-50"
    >
      <div className="p-4">
        <h2 className="text-lg font-semibold text-stone-800">
          {text}, {name}
        </h2>
        <p className="mt-0.5 text-sm text-stone-500">{formatDate(time)}</p>
        <p className="mt-0.5 text-xs text-stone-400">{formatTime(time)}</p>
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// CheckinCard
// ---------------------------------------------------------------------------

interface CheckinCardProps {
  mood: number;
  dimensionScores: Array<{ dimension: string; score: number }>;
  time: string;
  date: string;
}

export function CheckinCard({ mood, dimensionScores, time, date }: CheckinCardProps) {
  const moodInfo = MOOD_MAP[mood] ?? MOOD_MAP[3];

  return (
    <CardShell
      borderColor="border-l-[3px] border-l-sage-400"
      nodeIcon={CheckCircle}
      nodeColor="bg-sage-500"
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-label={moodInfo.label}>
              {moodInfo.emoji}
            </span>
            <div>
              <p className="text-sm font-medium text-stone-800">
                Check-in: {moodInfo.label}
              </p>
              <p className="text-xs text-stone-400">{date}</p>
            </div>
          </div>
          <span className="text-xs text-stone-400">{formatTime(time)}</span>
        </div>

        {dimensionScores.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {dimensionScores.map(({ dimension, score }) => {
              const dotColor =
                DIMENSION_COLORS[dimension] ?? 'bg-stone-400';
              return (
                <div
                  key={dimension}
                  className="flex items-center gap-1"
                  title={`${dimension}: ${score}/10`}
                >
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`}
                  />
                  <span className="text-[11px] text-stone-500 capitalize">
                    {dimension}
                  </span>
                  <span className="text-[11px] font-medium text-stone-600">
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// InsightCard
// ---------------------------------------------------------------------------

interface InsightCardProps {
  text: string;
  time: string;
}

export function InsightCard({ text, time }: InsightCardProps) {
  return (
    <CardShell
      borderColor="border-l-[3px] border-l-sage-500"
      nodeIcon={Sparkles}
      nodeColor="bg-sage-500"
      className="bg-sage-50"
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sage-600">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Aria noticed
            </span>
          </div>
          <span className="text-xs text-stone-400">{formatTime(time)}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">{text}</p>
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// JournalCard
// ---------------------------------------------------------------------------

interface JournalCardProps {
  preview: string;
  time: string;
}

export function JournalCard({ preview, time }: JournalCardProps) {
  return (
    <CardShell
      borderColor="border-l-[3px] border-l-amber-400"
      nodeIcon={BookOpen}
      nodeColor="bg-amber-400"
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-stone-600">
            <BookOpen className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Journal
            </span>
          </div>
          <span className="text-xs text-stone-400">{formatTime(time)}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-stone-700 line-clamp-3">
          {preview}
        </p>
        <Link
          href="/journal"
          className="mt-2 inline-block text-xs font-medium text-sage-500 hover:text-sage-600 transition-colors"
        >
          Read more
        </Link>
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// GoalMilestoneCard
// ---------------------------------------------------------------------------

interface GoalMilestoneCardProps {
  goalTitle: string;
  progress: number;
  time: string;
}

export function GoalMilestoneCard({ goalTitle, progress, time }: GoalMilestoneCardProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <CardShell
      borderColor="border-l-[3px] border-l-blue-400"
      nodeIcon={Target}
      nodeColor="bg-blue-400"
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-stone-600">
            <Target className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Goal update
            </span>
          </div>
          <span className="text-xs text-stone-400">{formatTime(time)}</span>
        </div>
        <p className="mt-2 text-sm font-medium text-stone-800">{goalTitle}</p>
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>Progress</span>
            <span>{clampedProgress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-stone-100">
            <div
              className="h-1.5 rounded-full bg-sage-500 transition-all"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// NudgeCard
// ---------------------------------------------------------------------------

interface NudgeCardProps {
  text: string;
  action?: string;
  href?: string;
}

export function NudgeCard({ text, action, href }: NudgeCardProps) {
  return (
    <CardShell
      borderColor="border-l-[3px] border-l-warm-400"
      nodeIcon={Bell}
      nodeColor="bg-warm-400"
      className="bg-warm-50"
    >
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-warm-500">
          <Bell className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Nudge from Aria
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">{text}</p>
        {action && href && (
          <Link
            href={href}
            className="mt-3 inline-flex items-center rounded-lg bg-warm-100 px-3 py-1.5 text-xs font-medium text-warm-600 hover:bg-warm-200 transition-colors"
          >
            {action}
          </Link>
        )}
        {action && !href && (
          <button
            type="button"
            className="mt-3 inline-flex items-center rounded-lg bg-warm-100 px-3 py-1.5 text-xs font-medium text-warm-600 hover:bg-warm-200 transition-colors"
          >
            {action}
          </button>
        )}
      </div>
    </CardShell>
  );
}
