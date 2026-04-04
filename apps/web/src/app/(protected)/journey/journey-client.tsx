'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, Badge, Button, Skeleton } from '@life-design/ui';
import {
  TrendUp,
  Star,
  Repeat,
  Flag,
  Fire,
  Sun,
  Target,
  Sparkle,
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import type { IconProps } from '@phosphor-icons/react';
import type {
  JourneyNarrative,
  JourneyHighlight,
  TimelineEvent,
} from '@/lib/services/journey-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
  });
}

function formatMonoDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// ---------------------------------------------------------------------------
// Highlight config
// ---------------------------------------------------------------------------

type HighlightType = JourneyHighlight['type'];

const HIGHLIGHT_CONFIG: Record<
  HighlightType,
  { icon: React.FC<IconProps>; badgeVariant: 'sage' | 'accent' | 'warm' | 'stone'; iconClass: string; bgClass: string }
> = {
  improvement: {
    icon: TrendUp,
    badgeVariant: 'sage',
    iconClass: 'text-sage-500',
    bgClass: 'bg-sage-50',
  },
  strength: {
    icon: Star,
    badgeVariant: 'accent',
    iconClass: 'text-accent-500',
    bgClass: 'bg-accent-400/10',
  },
  pattern: {
    icon: Repeat,
    badgeVariant: 'warm',
    iconClass: 'text-warm-500',
    bgClass: 'bg-warm-50',
  },
  milestone: {
    icon: Flag,
    badgeVariant: 'stone',
    iconClass: 'text-stone-500',
    bgClass: 'bg-stone-100',
  },
};

// ---------------------------------------------------------------------------
// Timeline icon config
// ---------------------------------------------------------------------------

type TimelineType = TimelineEvent['type'];

const TIMELINE_CONFIG: Record<TimelineType, { icon: React.FC<IconProps>; iconClass: string }> = {
  first_checkin: { icon: Sun, iconClass: 'text-warm-500' },
  goal_created: { icon: Target, iconClass: 'text-accent-500' },
  milestone_hit: { icon: Flag, iconClass: 'text-stone-500' },
  streak_record: { icon: Fire, iconClass: 'text-warm-500' },
  insight: { icon: Sparkle, iconClass: 'text-sage-500' },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  value,
  label,
  icon,
  iconClass,
}: {
  value: React.ReactNode;
  label: string;
  icon?: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <div className="flex-shrink-0 min-w-[96px] rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {icon && <span className={iconClass}>{icon}</span>}
        <span className="font-mono text-2xl font-bold text-stone-900">{value}</span>
      </div>
      <p className="text-xs text-stone-500 leading-tight">{label}</p>
    </div>
  );
}

function HighlightCard({ highlight }: { highlight: JourneyHighlight }) {
  const config = HIGHLIGHT_CONFIG[highlight.type];
  const Icon = config.icon;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bgClass}`}>
          <Icon size={16} weight="light" className={config.iconClass} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 leading-snug">{highlight.title}</p>
          {highlight.dimension && (
            <Badge variant={config.badgeVariant} className="mt-1">
              {highlight.dimension}
            </Badge>
          )}
        </div>
        {highlight.delta !== undefined && (
          <span className="text-xs font-mono font-bold text-sage-500 flex-shrink-0">
            +{highlight.delta.toFixed(1)}
          </span>
        )}
      </div>
      <p className="text-xs text-stone-500 leading-relaxed">{highlight.description}</p>
    </div>
  );
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const config = TIMELINE_CONFIG[event.type];
  const Icon = config.icon;
  return (
    <div className="flex gap-4">
      {/* Left: dot + line */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-sage-400 flex-shrink-0 mt-0.5" />
        {!isLast && <div className="w-px flex-1 bg-stone-200 mt-1 mb-0" />}
      </div>
      {/* Right: content */}
      <div className="flex items-start gap-2 pb-5">
        <div className="flex-shrink-0 mt-0.5">
          <Icon size={14} weight="light" className={config.iconClass} />
        </div>
        <div>
          <span className="font-mono text-[11px] text-stone-400 block leading-none mb-1">
            {formatMonoDate(event.date)}
          </span>
          <p className="text-sm text-stone-700 leading-snug">{event.label}</p>
          {event.dimension && (
            <Badge variant="sage" className="mt-1">
              {event.dimension}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function JourneyClient() {
  const [data, setData] = useState<JourneyNarrative | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJourney = useCallback(async () => {
    try {
      const res = await fetch('/api/journey');
      if (!res.ok) throw new Error('Failed to load journey');
      const json = await res.json() as { data: JourneyNarrative | null };
      setData(json.data);
    } catch {
      setError('Could not load your journey. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJourney();
  }, [fetchJourney]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/journey', { method: 'POST' });
      if (res.status === 429) {
        // Already rate-limited — server returns existing data
        const json = await res.json() as { data: JourneyNarrative };
        setData(json.data);
        setError('Your story was refreshed less than 24 hours ago.');
      } else if (!res.ok) {
        throw new Error('Failed to generate narrative');
      } else {
        const json = await res.json() as { data: JourneyNarrative };
        setData(json.data);
      }
    } catch {
      setError('Could not refresh your story. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Derived state ──
  const canRefresh = !data || hoursSince(data.generatedAt) >= 24;
  const moodTrend = data?.stats.moodTrend;

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-4 w-56 rounded-lg" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-28 flex-shrink-0 rounded-2xl" />)}
        </div>
        <Skeleton className="h-52 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (!data) {
    return (
      <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="font-serif text-3xl text-stone-900">My Journey</h1>
        </header>
        <Card className="p-10 text-center flex flex-col items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-sage-50 flex items-center justify-center">
            <Sparkle size={32} weight="light" className="text-sage-400" />
          </div>
          <div>
            <p className="font-serif text-lg text-stone-800 mb-1">Your story is waiting to be told</p>
            <p className="text-sm text-stone-500 max-w-xs mx-auto">
              Complete 2 or more check-ins to generate your AI-written progress story and journey highlights.
            </p>
          </div>
          <Link
            href="/checkin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-sage-600 text-white text-[13px] font-semibold shadow-sm hover:bg-sage-600/90 transition-colors"
          >
            <Sun size={16} weight="light" />
            Start a check-in
          </Link>
        </Card>
      </div>
    );
  }

  // ── Main view ──
  const { stats, highlights, keyQuotes, timelineEvents } = data;

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto space-y-8">

      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <header>
        <h1 className="font-serif text-3xl text-stone-900">My Journey</h1>
        <p className="text-sm text-stone-500 mt-1">
          {formatDate(data.periodStart)} &ndash; {formatDate(data.periodEnd)}
        </p>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Stats Row */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        <StatCard value={stats.totalCheckins} label="Check-ins" />
        <StatCard value={stats.totalJournalEntries} label="Journal entries" />
        <StatCard
          value={stats.currentStreak}
          label="Day streak"
          icon={<Fire size={16} weight="light" />}
          iconClass="text-warm-500"
        />
        <StatCard value={stats.daysSinceStart} label="Days active" />
        <StatCard
          value={stats.averageMood.toFixed(1)}
          label="Avg mood"
          icon={
            moodTrend === 'improving' ? (
              <ArrowUp size={14} weight="bold" />
            ) : moodTrend === 'declining' ? (
              <ArrowDown size={14} weight="bold" />
            ) : (
              <Minus size={14} weight="bold" />
            )
          }
          iconClass={
            moodTrend === 'improving'
              ? 'text-sage-500'
              : moodTrend === 'declining'
              ? 'text-warm-500'
              : 'text-stone-400'
          }
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* AI Narrative */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="narrative-heading">
        <div className="rounded-2xl border border-sage-200 bg-sage-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Sparkle size={16} weight="light" className="text-sage-500 flex-shrink-0" />
              <h2 id="narrative-heading" className="font-serif text-base text-sage-700 font-medium">
                Your Story
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleRefresh()}
              loading={refreshing}
              disabled={!canRefresh || refreshing}
              className="flex-shrink-0 gap-1.5 text-sage-600 hover:bg-sage-100"
              aria-label="Refresh journey story"
            >
              {!refreshing && <ArrowsClockwise size={13} weight="light" />}
              Refresh
            </Button>
          </div>

          <div className="space-y-3">
            {data.narrative.split('\n\n').filter(Boolean).map((paragraph, i) => (
              <p key={i} className="font-serif italic text-stone-700 text-sm leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <p className="text-xs text-stone-400">
              Last updated {relativeTime(data.generatedAt)}
            </p>
            {!canRefresh && (
              <span className="text-xs text-stone-400">&middot; Refreshes in {Math.ceil(24 - hoursSince(data.generatedAt))}h</span>
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs text-warm-600 font-medium">{error}</p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Highlights Grid */}
      {/* ------------------------------------------------------------------ */}
      {highlights.length > 0 && (
        <section aria-labelledby="highlights-heading">
          <h2 id="highlights-heading" className="font-serif text-xl text-stone-800 mb-3">
            Highlights
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {highlights.map((h, i) => (
              <HighlightCard key={i} highlight={h} />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Key Quotes */}
      {/* ------------------------------------------------------------------ */}
      {keyQuotes.length > 0 && (
        <section aria-labelledby="quotes-heading">
          <h2 id="quotes-heading" className="font-serif text-xl text-stone-800 mb-3">
            Your Words
          </h2>
          <div className="space-y-4">
            {keyQuotes.map((quote, i) => (
              <blockquote
                key={i}
                className="border-l-2 border-sage-300 pl-4 space-y-1"
              >
                <p className="font-serif italic text-stone-700 text-sm leading-relaxed">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <footer className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-stone-400">
                    {formatDateShort(quote.date)}
                  </span>
                  <Badge variant="stone">{quote.context}</Badge>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Timeline */}
      {/* ------------------------------------------------------------------ */}
      {timelineEvents.length > 0 && (
        <section aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="font-serif text-xl text-stone-800 mb-4">
            Timeline
          </h2>
          <div>
            {timelineEvents
              .slice()
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((event, i, arr) => (
                <TimelineItem
                  key={i}
                  event={event}
                  isLast={i === arr.length - 1}
                />
              ))}
          </div>
        </section>
      )}

    </div>
  );
}
