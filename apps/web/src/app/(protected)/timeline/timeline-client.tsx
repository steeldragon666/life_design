'use client';

import React, { useMemo } from 'react';
import {
  CheckCircle,
  Sparkles,
  BookOpen,
  Target,
  Calendar,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimelineEvent = {
  id: string;
  type: 'checkin' | 'journal' | 'insight' | 'goal';
  date: string;
  data: Record<string, unknown>;
};

interface TimelineClientProps {
  events: TimelineEvent[];
}

type FilterType = 'all' | 'checkin' | 'journal' | 'insight' | 'goal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - d.getDay());
  return `Week of ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const MOOD_EMOJI: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };

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

const TYPE_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; nodeColor: string; borderColor: string; label: string }> = {
  checkin: { icon: CheckCircle, color: 'text-sage-600', nodeColor: 'bg-sage-100', borderColor: 'border-l-sage-400', label: 'Check-in' },
  journal: { icon: BookOpen, color: 'text-amber-600', nodeColor: 'bg-amber-50', borderColor: 'border-l-amber-400', label: 'Journal' },
  insight: { icon: Sparkles, color: 'text-sage-600', nodeColor: 'bg-sage-50', borderColor: 'border-l-sage-500', label: 'Insight' },
  goal: { icon: Target, color: 'text-blue-500', nodeColor: 'bg-blue-50', borderColor: 'border-l-blue-400', label: 'Goal' },
};

// ---------------------------------------------------------------------------
// Event card renderers
// ---------------------------------------------------------------------------

function CheckinEvent({ data, date }: { data: Record<string, unknown>; date: string }) {
  const mood = data.mood as number;
  const scores = (data.dimensionScores ?? []) as Array<{ dimension: string; score: number }>;
  const journal = data.journalEntry as string | undefined;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{MOOD_EMOJI[mood] ?? '😐'}</span>
        <span className="text-sm font-medium text-stone-700">Mood: {mood}/5</span>
        <span className="text-xs text-stone-400 ml-auto">{formatTime(date)}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {scores.map((ds) => (
          <span key={ds.dimension} className="inline-flex items-center gap-1 text-xs text-stone-600">
            <span className={`w-2 h-2 rounded-full ${DIMENSION_COLORS[ds.dimension] ?? 'bg-stone-300'}`} />
            <span className="capitalize">{ds.dimension}</span>
            <span className="font-mono text-sage-600">{ds.score}</span>
          </span>
        ))}
      </div>
      {journal && (
        <p className="text-sm text-stone-600 line-clamp-2 italic">&ldquo;{journal}&rdquo;</p>
      )}
    </div>
  );
}

function JournalEvent({ data, date }: { data: Record<string, unknown>; date: string }) {
  const content = data.content as string;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-stone-400">{formatTime(date)}</span>
      </div>
      <p className="text-sm text-stone-700 line-clamp-3">{content}</p>
    </div>
  );
}

function InsightEvent({ data, date }: { data: Record<string, unknown>; date: string }) {
  const title = data.title as string;
  const body = data.body as string;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-sage-600 font-medium flex items-center gap-1">
          <Sparkles size={10} />
          Aria noticed
        </span>
        <span className="text-xs text-stone-400">{formatTime(date)}</span>
      </div>
      <h4 className="text-sm font-medium text-stone-900">{title}</h4>
      <p className="text-sm text-stone-600 line-clamp-2 mt-0.5">{body}</p>
    </div>
  );
}

function GoalEvent({ data, date }: { data: Record<string, unknown>; date: string }) {
  const title = data.title as string;
  const status = data.status as string;
  const milestones = (data.milestones ?? []) as Array<{ id: string; completed: boolean }>;
  const completed = milestones.filter((m) => m.completed).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-stone-400">{formatTime(date)}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          status === 'completed' ? 'bg-sage-100 text-sage-700' : 'bg-blue-50 text-blue-600'
        }`}>
          {status}
        </span>
      </div>
      <h4 className="text-sm font-medium text-stone-900">{title}</h4>
      {milestones.length > 0 && (
        <p className="text-xs text-stone-500 mt-1">
          {completed}/{milestones.length} milestones completed
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Timeline
// ---------------------------------------------------------------------------

export default function TimelineClient({ events }: TimelineClientProps) {
  const [filter, setFilter] = React.useState<FilterType>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.type === filter)),
    [events, filter],
  );

  // Group by week
  const grouped = useMemo(() => {
    const groups: Map<string, TimelineEvent[]> = new Map();
    for (const event of filtered) {
      const week = getWeekLabel(event.date);
      if (!groups.has(week)) groups.set(week, []);
      groups.get(week)!.push(event);
    }
    return groups;
  }, [filtered]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'checkin', label: 'Check-ins' },
    { key: 'journal', label: 'Journal' },
    { key: 'insight', label: 'Insights' },
    { key: 'goal', label: 'Goals' },
  ];

  return (
    <div className="px-5 py-6">
      {/* Filter bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === f.key
                ? 'bg-sage-100 text-sage-700 shadow-sm'
                : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={32} className="text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">No events yet. Start by doing a check-in!</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-sage-200/60" />

          {Array.from(grouped.entries()).map(([weekLabel, weekEvents]) => (
            <div key={weekLabel} className="mb-8">
              {/* Week header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center z-10">
                  <Calendar size={16} className="text-stone-500" />
                </div>
                <h3 className="text-sm font-semibold text-stone-700">{weekLabel}</h3>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              {/* Events */}
              <div className="space-y-4">
                {weekEvents.map((event) => {
                  const config = TYPE_CONFIG[event.type];
                  const Icon = config.icon;

                  return (
                    <div key={event.id} className="flex gap-4">
                      {/* Timeline node */}
                      <div className={`shrink-0 w-10 h-10 rounded-full ${config.nodeColor} flex items-center justify-center z-10`}>
                        <Icon size={16} className={config.color} />
                      </div>

                      {/* Card */}
                      <div className={`flex-1 rounded-2xl bg-white border border-stone-200 border-l-[3px] ${config.borderColor} p-4 hover:shadow-sm transition`}>
                        <div className="text-xs text-stone-400 mb-1">{formatDate(event.date)}</div>
                        {event.type === 'checkin' && <CheckinEvent data={event.data} date={event.date} />}
                        {event.type === 'journal' && <JournalEvent data={event.data} date={event.date} />}
                        {event.type === 'insight' && <InsightEvent data={event.data} date={event.date} />}
                        {event.type === 'goal' && <GoalEvent data={event.data} date={event.date} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
