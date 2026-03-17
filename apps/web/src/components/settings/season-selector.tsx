'use client';

import { useState, useEffect, useCallback } from 'react';
import { Leaf, Lightning, Sun, Scales } from '@phosphor-icons/react';
import { DIMENSION_LABELS, type Dimension } from '@life-design/core';
import {
  SeasonManager,
  SEASON_DESCRIPTIONS,
  SEASON_WEIGHTS,
  ALL_SEASONS,
} from '@/lib/context/season-manager';
import type { SeasonName, SeasonRecord } from '@/lib/ml/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEASON_ICONS: Record<SeasonName, typeof Lightning> = {
  Sprint: Lightning,
  Recharge: Leaf,
  Exploration: Sun,
  Maintenance: Scales,
};

const SEASON_COLOURS: Record<SeasonName, { bg: string; border: string; text: string; ring: string }> = {
  Sprint: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    ring: 'ring-amber-400',
  },
  Recharge: {
    bg: 'bg-[#5A7F5A]/5',
    border: 'border-[#5A7F5A]/20',
    text: 'text-[#5A7F5A]',
    ring: 'ring-[#5A7F5A]',
  },
  Exploration: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    ring: 'ring-sky-400',
  },
  Maintenance: {
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    text: 'text-stone-600',
    ring: 'ring-stone-400',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysSince(dateStr: string): number {
  const start = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const manager = new SeasonManager();

export default function SeasonSelector() {
  const [activeSeason, setActiveSeason] = useState<SeasonRecord | undefined>();
  const [history, setHistory] = useState<SeasonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [active, hist] = await Promise.all([
        manager.getActiveSeason(),
        manager.getHistory(10),
      ]);
      setActiveSeason(active);
      setHistory(hist);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = useCallback(
    async (name: SeasonName) => {
      if (switching) return;
      setSwitching(true);
      try {
        await manager.setSeason(name);
        await load();
      } finally {
        setSwitching(false);
      }
    },
    [switching, load],
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-40 rounded bg-[#E8E4DD]" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-[#E8E4DD]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-[#1A1816]">Life Season</h3>
        <p className="mt-1 text-sm text-[#7D756A]">
          Your current season adjusts how dimensions are weighted in predictions and guardian alerts.
        </p>
      </div>

      {/* Active season banner */}
      {activeSeason && (
        <ActiveSeasonBanner season={activeSeason} />
      )}

      {/* Season cards */}
      <div className="grid grid-cols-2 gap-3">
        {ALL_SEASONS.map((name) => (
          <SeasonCard
            key={name}
            name={name}
            isActive={activeSeason?.name === name}
            isSwitching={switching}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[#1A1816] mb-3">Past seasons</h4>
          <div className="space-y-2">
            {history.map((record) => (
              <HistoryRow key={record.id} record={record} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ActiveSeasonBanner({ season }: { season: SeasonRecord }) {
  const colours = SEASON_COLOURS[season.name];
  const Icon = SEASON_ICONS[season.name];
  const days = daysSince(season.startDate);

  return (
    <div
      className={`
        flex items-center gap-3 rounded-xl border p-4
        ${colours.bg} ${colours.border}
      `}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colours.bg}`}>
        <Icon className={`h-5 w-5 ${colours.text}`} weight="fill" />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${colours.text}`}>
          {season.name}
        </p>
        <p className="text-xs text-[#7D756A]">
          Active since {formatDate(season.startDate)} ({days} day{days !== 1 ? 's' : ''})
        </p>
      </div>
    </div>
  );
}

function SeasonCard({
  name,
  isActive,
  isSwitching,
  onSelect,
}: {
  name: SeasonName;
  isActive: boolean;
  isSwitching: boolean;
  onSelect: (name: SeasonName) => void;
}) {
  const colours = SEASON_COLOURS[name];
  const Icon = SEASON_ICONS[name];
  const description = SEASON_DESCRIPTIONS[name];
  const weights = SEASON_WEIGHTS[name];

  // Find the top 2 boosted dimensions
  const topDims = Object.entries(weights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([dim]) => DIMENSION_LABELS[dim as Dimension] ?? dim);

  return (
    <button
      onClick={() => onSelect(name)}
      disabled={isActive || isSwitching}
      className={`
        relative flex flex-col items-start rounded-xl border p-4 text-left
        transition-all duration-200
        ${isActive
          ? `${colours.bg} ${colours.border} ring-2 ${colours.ring}`
          : `bg-white border-[#E8E4DD] hover:border-[#7D756A]/30 hover:shadow-sm`
        }
        disabled:cursor-default
      `}
    >
      {/* Active indicator */}
      {isActive && (
        <span className={`absolute right-3 top-3 h-2 w-2 rounded-full ${colours.text.replace('text-', 'bg-')}`} />
      )}

      <Icon
        className={`h-6 w-6 mb-2 ${isActive ? colours.text : 'text-[#7D756A]'}`}
        weight={isActive ? 'fill' : 'regular'}
      />

      <p className={`text-sm font-semibold mb-1 ${isActive ? colours.text : 'text-[#1A1816]'}`}>
        {name}
      </p>

      <p className="text-xs text-[#7D756A] leading-relaxed mb-2">
        {description}
      </p>

      {/* Top dimensions */}
      <div className="flex flex-wrap gap-1 mt-auto">
        {topDims.map((dim) => (
          <span
            key={dim}
            className="inline-flex items-center rounded-full bg-[#F5F3EF] px-2 py-0.5 text-[10px] font-medium text-[#7D756A]"
          >
            {dim}
          </span>
        ))}
      </div>
    </button>
  );
}

function HistoryRow({ record }: { record: SeasonRecord }) {
  const colours = SEASON_COLOURS[record.name];
  const Icon = SEASON_ICONS[record.name];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#E8E4DD] bg-white p-3">
      <Icon className={`h-4 w-4 ${colours.text}`} weight="regular" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1816]">{record.name}</p>
        <p className="text-xs text-[#7D756A] truncate">
          {formatDate(record.startDate)}
          {record.endDate ? ` -- ${formatDate(record.endDate)}` : ''}
        </p>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-[#7D756A]">
        {record.triggerSource === 'manual' ? 'manual' : record.triggerSource}
      </span>
    </div>
  );
}
