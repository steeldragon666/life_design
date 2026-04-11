'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  PenLine,
  Flame,
  Search,
  X,
  Trash2,
  FileEdit,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { Card, Button, Textarea } from '@life-design/ui';
import { db } from '@/lib/db';
import type { DBJournalEntry } from '@/lib/db/schema';
import { analyzeJournalEntryLocal } from '@/lib/services/journal-analysis-service';
import { getSmartJournalPrompts } from '@/lib/smart-prompts';
import { useGuest } from '@/lib/guest-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SourceFilter = 'all' | 'standalone' | 'checkin';

interface DisplayEntry {
  id: number;
  content: string;
  source: 'standalone' | 'checkin';
  sentiment?: number;
  themes?: string[];
  dimensions?: string[];
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 6) return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

function groupByDate(entries: DisplayEntry[]): Map<string, DisplayEntry[]> {
  const map = new Map<string, DisplayEntry[]>();
  for (const entry of entries) {
    const key = entry.createdAt.toLocaleDateString('en-AU', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const group = map.get(key) ?? [];
    group.push(entry);
    map.set(key, group);
  }
  return map;
}

function sentimentDot(sentiment?: number): { bg: string; label: string } {
  if (sentiment === undefined || sentiment === null) return { bg: 'bg-stone-300', label: 'Neutral' };
  if (sentiment > 0.2) return { bg: 'bg-sage-400', label: 'Positive' };
  if (sentiment < -0.2) return { bg: 'bg-warm-400', label: 'Negative' };
  return { bg: 'bg-stone-300', label: 'Neutral' };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StreakPill({ current, longest }: { current: number; longest: number }) {
  if (current === 0 && longest === 0) return null;
  return (
    <div className="flex items-center gap-3">
      {current > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-warm-50 border border-warm-100">
          <Flame size={14} className="text-warm-500" />
          <span className="text-xs font-mono font-medium text-warm-600">{current}d streak</span>
        </div>
      )}
      {longest > 0 && (
        <span className="text-xs text-stone-400 font-mono">best {longest}d</span>
      )}
    </div>
  );
}

function SmartPromptBar({
  prompts,
  onSelect,
}: {
  prompts: { dimension: string; prompt: string }[];
  onSelect: (p: string) => void;
}) {
  if (!prompts.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {prompts.map((p) => (
        <button
          key={p.prompt}
          onClick={() => onSelect(p.prompt)}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200 bg-stone-50 hover:bg-sage-50 hover:border-sage-200 text-xs text-stone-600 hover:text-sage-700 transition-all"
        >
          <Sparkles size={11} className="text-stone-400 group-hover:text-sage-400" />
          <span className="truncate max-w-[200px]">{p.prompt}</span>
        </button>
      ))}
    </div>
  );
}

function EntryCard({
  entry,
  expanded,
  onToggle,
  onDelete,
  onUpdate,
}: {
  entry: DisplayEntry;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (content: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry.content);
  const [saving, setSaving] = useState(false);
  const dot = sentimentDot(entry.sentiment);
  const isLong = entry.content.length > 200;
  const preview = isLong && !expanded ? `${entry.content.slice(0, 200)}…` : entry.content;

  const handleSave = async () => {
    if (!editValue.trim() || editValue === entry.content) { setEditing(false); return; }
    setSaving(true);
    await onUpdate(editValue.trim());
    setSaving(false);
    setEditing(false);
  };

  return (
    <article
      className="rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-sm"
      aria-label="Journal entry"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${dot.bg}`}
          title={dot.label}
          aria-label={`Sentiment: ${dot.label}`}
        />
        <span className="text-[11px] font-mono text-stone-400">{relativeTime(entry.createdAt)}</span>
        <div className="flex-1" />
        <span
          className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${
            entry.source === 'checkin'
              ? 'bg-sage-50 text-sage-600 border border-sage-100'
              : 'bg-stone-100 text-stone-500'
          }`}
        >
          {entry.source === 'checkin' ? 'Check-in' : 'Journal'}
        </span>
      </div>

      {/* Content */}
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-h-[100px] text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditValue(entry.content); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={onToggle}
          className="w-full text-left"
          aria-expanded={expanded}
        >
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{preview}</p>
          {isLong && !expanded && (
            <span className="text-xs text-sage-500 font-medium mt-1 inline-block">Read more</span>
          )}
        </button>
      )}

      {/* Dimension badges */}
      {entry.dimensions && entry.dimensions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {entry.dimensions.map((dim) => (
            <span
              key={dim}
              className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-stone-100 text-stone-500 capitalize"
            >
              {dim}
            </span>
          ))}
        </div>
      )}

      {/* Actions — visible when expanded */}
      {expanded && !editing && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-100">
          {entry.source === 'standalone' && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <FileEdit size={13} />
              Edit
            </button>
          )}
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-auto"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function JournalClient() {
  const { isGuest } = useGuest();

  // --- Dexie live query ---
  const dbEntries = useLiveQuery(
    () => db.journalEntries.orderBy('createdAt').reverse().toArray(),
    [],
  );

  // --- Streak from Dexie ---
  const streak = useLiveQuery(async () => {
    const all = await db.journalEntries.orderBy('createdAt').reverse().toArray();
    if (!all.length) return { current: 0, longest: 0 };
    const dates = [...new Set(all.map((e) => e.createdAt.toISOString().split('T')[0]))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let current = 0;
    let longest = 0;
    let run = 1;
    if (dates[0] === today || dates[0] === yesterday) {
      current = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i - 1]!).getTime() - new Date(dates[i]!).getTime()) / 86400000;
        if (Math.round(diff) === 1) current++;
        else break;
      }
    }
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i - 1]!).getTime() - new Date(dates[i]!).getTime()) / 86400000;
      if (Math.round(diff) === 1) run++;
      else { longest = Math.max(longest, run); run = 1; }
    }
    return { current, longest: Math.max(longest, run, current) };
  }, [dbEntries]);

  // --- UI state ---
  const [showEditor, setShowEditor] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Smart prompts (from most recent check-in scores) ---
  const latestScores = useLiveQuery(async () => {
    const checkin = await db.checkIns.orderBy('date').reverse().first();
    if (!checkin) return [];
    return Object.entries(checkin.dimensionScores).map(([dimension, score]) => ({
      dimension,
      score: score ?? 0,
    }));
  }, []);

  const smartPrompts = useMemo(
    () => getSmartJournalPrompts(latestScores ?? [], 2),
    [latestScores],
  );

  // --- Filtered entries ---
  const entries: DisplayEntry[] = useMemo(() => {
    const raw = dbEntries ?? [];
    return raw
      .filter((e): e is DBJournalEntry & { id: number } => e.id !== undefined)
      .map((e) => ({ ...e, id: e.id }))
      .filter((e) => filter === 'all' || e.source === filter)
      .filter((e) =>
        search.trim() === '' ||
        e.content.toLowerCase().includes(search.toLowerCase()),
      );
  }, [dbEntries, filter, search]);

  const grouped = useMemo(() => groupByDate(entries), [entries]);

  // --- Handlers ---
  const handleSave = useCallback(async () => {
    const content = draft.trim();
    if (!content) return;
    setSaving(true);
    try {
      if (isGuest) {
        const analysis = analyzeJournalEntryLocal(content);
        await db.journalEntries.add({
          content,
          source: 'standalone',
          sentiment: analysis.sentiment,
          themes: analysis.themes,
          dimensions: analysis.dimensions,
          createdAt: new Date(),
        });
      } else {
        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error('Failed to save');
        // Also persist locally for instant display
        const analysis = analyzeJournalEntryLocal(content);
        await db.journalEntries.add({
          content,
          source: 'standalone',
          sentiment: analysis.sentiment,
          themes: analysis.themes,
          dimensions: analysis.dimensions,
          createdAt: new Date(),
        });
      }
      setDraft('');
      setShowEditor(false);
    } finally {
      setSaving(false);
    }
  }, [draft, isGuest]);

  const handleDelete = useCallback(async (id: number) => {
    await db.journalEntries.delete(id);
    if (expandedId === id) setExpandedId(null);
  }, [expandedId]);

  const handleUpdate = useCallback(async (id: number, content: string) => {
    const analysis = analyzeJournalEntryLocal(content);
    await db.journalEntries.update(id, {
      content,
      sentiment: analysis.sentiment,
      themes: analysis.themes,
      dimensions: analysis.dimensions,
    });
  }, []);

  const handlePromptSelect = (prompt: string) => {
    setShowEditor(true);
    setDraft(prompt + '\n\n');
    setTimeout(() => {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }, 50);
  };

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto">
      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-stone-900">Journal</h1>
          <p className="text-sm text-stone-400 mt-1">A private space to reflect and think clearly</p>
        </div>
        <Button
          onClick={() => { setShowEditor((v) => !v); setTimeout(() => textareaRef.current?.focus(), 50); }}
          className="flex items-center gap-2"
          size="sm"
        >
          <PenLine size={14} />
          New Entry
        </Button>
      </div>

      {/* Streak */}
      <div className="mb-6">
        <StreakPill current={streak?.current ?? 0} longest={streak?.longest ?? 0} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Inline editor */}
      {/* ------------------------------------------------------------------ */}
      {showEditor && (
        <Card className="mb-6 p-5 rounded-2xl border border-stone-200 bg-white animate-fade-up">
          <SmartPromptBar prompts={smartPrompts} onSelect={handlePromptSelect} />
          <Textarea
            ref={textareaRef}
            placeholder="What's on your mind today?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[120px] text-sm resize-none w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSave();
            }}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-stone-400">
              {draft.length > 0 && `${draft.length} chars · `}
              {draft.length > 0 ? 'Cmd+Enter to save' : 'Start writing…'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowEditor(false); setDraft(''); }}
              >
                <X size={14} weight="light" />
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving || !draft.trim()}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Filter bar */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Source filter pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100">
          {(['all', 'standalone', 'checkin'] as SourceFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {f === 'all' ? 'All' : f === 'checkin' ? 'Check-ins' : 'Journal'}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="flex-1 min-w-[160px] relative">
          <Search
            size={14}
                       className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-200 focus:border-sage-300 transition-all"
            aria-label="Search journal entries"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              aria-label="Clear search"
            >
              <X size={12} weight="light" />
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Timeline */}
      {/* ------------------------------------------------------------------ */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center">
            <MessageSquare size={32} className="text-stone-400" />
          </div>
          <div>
            <h2 className="font-serif text-xl text-stone-700">
              {search || filter !== 'all' ? 'No matching entries' : 'Your journal awaits'}
            </h2>
            <p className="text-sm text-stone-400 mt-1.5 max-w-xs mx-auto">
              {search || filter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Writing regularly helps you spot patterns, process emotions, and grow.'}
            </p>
          </div>
          {!search && filter === 'all' && (
            <button
              onClick={() => { setShowEditor(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sage-500 to-sage-600 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all"
            >
              Write your first entry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([dateLabel, dayEntries]) => (
            <section key={dateLabel}>
              <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-3">
                {dateLabel}
              </p>
              <div className="space-y-3">
                {dayEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggle={() => setExpandedId((id) => id === entry.id ? null : entry.id)}
                    onDelete={() => void handleDelete(entry.id)}
                    onUpdate={(content) => handleUpdate(entry.id, content)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
